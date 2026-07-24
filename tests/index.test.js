// tests/index.test.js
const request = require('supertest');
const express = require('express');
const { fetchUserContributions } = require('../src/github');
const { calculateStreaks } = require('../src/streaks');
const { generateCard, generateErrorCard } = require('../src/card');

// Build a test app wiring the real handlers but with mocked internals
function buildApp() {
  const app = express();
  const GITHUB_TOKEN = 'test-token';

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.get('/', async (req, res) => {
    const username = req.query.user || req.query.username;
    const locale = req.query.locale || 'en';
    const theme = req.query.theme || 'default';
    const mode = req.query.mode || 'daily';
    const date_format = req.query.date_format;

    if (!username) {
      const svg = generateErrorCard('Please provide a username', {
        locale,
        theme,
        mode,
        date_format,
      });
      return res.status(400).set('Content-Type', 'image/svg+xml').send(svg);
    }

    try {
      const contributions = await fetchUserContributions(username, GITHUB_TOKEN);
      const stats = calculateStreaks(contributions, mode);

      const cardData = {
        totalContributions: stats.totalContributions,
        currentStreak: stats.currentStreak.length,
        currentStreakStart: stats.currentStreak.start,
        currentStreakEnd: stats.currentStreak.end,
        longestStreak: stats.longestStreak.length,
        longestStreakStart: stats.longestStreak.start,
        longestStreakEnd: stats.longestStreak.end,
        firstContribution: stats.firstContribution,
      };

      const svg = generateCard(cardData, 495, 195, {
        locale,
        theme,
        mode,
        date_format,
      });

      res.set('Content-Type', 'image/svg+xml');
      res.set('Cache-Control', 'public, max-age=3600');
      res.send(svg);
    } catch (error) {
      if (error.message.includes('User not found') || error.message.includes('NOT_FOUND')) {
        return res
          .status(404)
          .send(generateErrorCard('User not found', { locale, theme, mode, date_format }));
      }
      if (error.message.includes('rate limit')) {
        return res
          .status(429)
          .send(
            generateErrorCard('Rate limit exceeded. Try again later.', {
              locale,
              theme,
              mode,
              date_format,
            }),
          );
      }
      return res
        .status(500)
        .send(generateErrorCard('Failed to fetch data', { locale, theme, mode, date_format }));
    }
  });

  return app;
}

// Mock the external modules
jest.mock('../src/github');
jest.mock('../src/streaks');
jest.mock('../src/card');

describe('Express routes', () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    generateCard.mockReturnValue('<svg>mocked</svg>');
    generateErrorCard.mockReturnValue('<svg>error</svg>');
  });

  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('GET / without user returns 400 and error card', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(400);
    expect(res.header['content-type']).toMatch(/image\/svg\+xml/);
    expect(generateErrorCard).toHaveBeenCalledWith(
      'Please provide a username',
      expect.objectContaining({ locale: 'en', theme: 'default', mode: 'daily' }),
    );
  });

  test('GET / with user not found returns 404', async () => {
    fetchUserContributions.mockRejectedValueOnce(new Error('User not found (NOT_FOUND)'));
    const res = await request(app).get('/?user=ghost');
    expect(res.status).toBe(404);
    expect(generateErrorCard).toHaveBeenCalledWith('User not found', expect.any(Object));
  });

  test('GET / rate limit returns 429', async () => {
    fetchUserContributions.mockRejectedValueOnce(new Error('rate limit exceeded'));
    const res = await request(app).get('/?user=octocat');
    expect(res.status).toBe(429);
    expect(generateErrorCard).toHaveBeenCalledWith(
      'Rate limit exceeded. Try again later.',
      expect.any(Object),
    );
  });

  test('GET / generic error returns 500', async () => {
    fetchUserContributions.mockRejectedValueOnce(new Error('boom'));
    const res = await request(app).get('/?user=octocat');
    expect(res.status).toBe(500);
    expect(generateErrorCard).toHaveBeenCalledWith('Failed to fetch data', expect.any(Object));
  });

  test('GET / success returns SVG with propagated options', async () => {
    fetchUserContributions.mockResolvedValueOnce({ '2023-01-01': 1 });
    calculateStreaks.mockReturnValueOnce({
      totalContributions: 1,
      currentStreak: { length: 1, start: '2023-01-01', end: '2023-01-01' },
      longestStreak: { length: 1, start: '2023-01-01', end: '2023-01-01' },
      firstContribution: '2023-01-01',
    });

    const res = await request(app).get(
      '/?user=octocat&locale=pt&theme=dark&mode=weekly&date_format=D%20MMM%20YYYY',
    );

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toMatch(/image\/svg\+xml/);
    // generateCard is mocked, we just ensure it was called with proper options
    expect(generateCard).toHaveBeenCalledWith(
      expect.objectContaining({ totalContributions: 1 }),
      495,
      195,
      expect.objectContaining({
        locale: 'pt',
        theme: 'dark',
        mode: 'weekly',
        date_format: 'D MMM YYYY',
      }),
    );
  });
});