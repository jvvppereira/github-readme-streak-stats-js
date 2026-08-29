const express = require('express');
const { fetchUserContributions } = require('./github');
const { calculateStreaks } = require('./streaks');
const { generateCard } = require('./card');

const app = express();
const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.TOKEN;

if (!GITHUB_TOKEN) {
  console.error('ERROR: GITHUB_TOKEN or TOKEN environment variable is required');
  process.exit(1);
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', async (req, res) => {
  const username = req.query.user || req.query.username;
  const locale = req.query.locale || 'en';
  const theme = req.query.theme || 'default';
  const mode = req.query.mode || 'daily';
  const date_format = req.query.date_format;

  const whitelistEnv = process.env.WHITELIST;
  const whitelist = whitelistEnv ? whitelistEnv.split(',').map(u => u.trim()).filter(Boolean) : [];
  if (whitelist.length && !whitelist.includes(username)) {
    const svg = generateErrorCard('User not allowed', { locale, theme, mode, date_format });
    return res.status(403).set('Content-Type', 'image/svg+xml').send(svg);
  }

  if (!username) {
    const svg = generateErrorCard('Please provide a username', { locale, theme, mode });
    return res.status(400).set('Content-Type', 'image/svg+xml').send(svg);
  }

  try {
    console.log(`Fetching contributions for ${username}...`);
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
      firstContribution: stats.firstContribution
    };

    const svg = generateCard(cardData, 495, 190, { locale, theme, mode, date_format });

    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(svg);
  } catch (error) {
    console.error(`Error for ${username}:`, error.message);
    
    if (error.message.includes('User not found') || error.message.includes('NOT_FOUND')) {
      return res.status(404).send(generateErrorCard('User not found', { locale, theme, mode, date_format }));
    }
    if (error.message.includes('rate limit')) {
      return res.status(429).send(generateErrorCard('Rate limit exceeded. Try again later.', { locale, theme, mode, date_format }));
    }
    return res.status(500).send(generateErrorCard('Failed to fetch data', { locale, theme, mode, date_format }));
  }
});



function generateErrorCard(message, params) {
  return generateCard({
    totalContributions: 0,
    currentStreak: { length: 0, start: null, end: null },
    longestStreak: { length: 0, start: null, end: null },
    firstContribution: null
  }, 495, 190, {
    locale: params.locale || 'en',
    theme: params.theme || 'default',
    mode: params.mode || 'daily',
    date_format: params.date_format,
    error: message
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Example: http://localhost:${PORT}/?user=denvercoder1`);
});

module.exports = app;
module.exports.generateErrorCard = generateErrorCard;