// tests/github.test.js
const {
  fetchUserContributions,
  fetchGraphQL,
  buildContributionQuery,
  parseContributionCalendar,
} = require('../src/github');
const {
  fetchGraphQL: svcFetchGraphQL,
  buildContributionQuery: svcBuildContributionQuery,
  parseContributionCalendar: svcParseContributionCalendar,
} = require('../src/services/githubService');

// Re‑export check – they are the same functions
test('github.js re‑exports service functions', () => {
  expect(fetchGraphQL).toBe(svcFetchGraphQL);
  expect(buildContributionQuery).toBe(svcBuildContributionQuery);
  expect(parseContributionCalendar).toBe(svcParseContributionCalendar);
});

// --------------------------------------------------
// fetchUserContributions – integration style test with mocked GraphQL
// --------------------------------------------------
global.fetch = jest.fn();

beforeEach(() => {
  fetch.mockReset();
});

test('fetchUserContributions aggregates multiple years', async () => {
  const currentYear = new Date().getFullYear();
  const userCreatedYear = 2015;

  // Mock current year response (includes createdAt)
  const currentYearResponse = {
    createdAt: `${userCreatedYear}-01-01T00:00:00Z`,
    contributionsCollection: {
      contributionYears: [2020, 2021, 2022],
      contributionCalendar: {
        weeks: [
          {
            contributionDays: [
              { date: `${currentYear}-01-01`, contributionCount: 2 },
            ],
          },
        ],
      },
    },
  };

  // Mock previous year response
  const prevYearResponse = {
    contributionsCollection: {
      contributionCalendar: {
        weeks: [
          {
            contributionDays: [
              { date: '2022-12-31', contributionCount: 5 },
            ],
          },
        ],
      },
    },
  };

  // First call -> current year, subsequent calls -> previous years
  fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { user: currentYearResponse } }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { user: prevYearResponse } }),
    });

  const contributions = await fetchUserContributions('octocat', 'fake-token');

  // Should contain data from both years
  expect(contributions[`${currentYear}-01-01`]).toBe(2);
  expect(contributions['2022-12-31']).toBe(5);
});

test('fetchUserContributions throws when user not found', async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      errors: [{ type: 'NOT_FOUND', message: 'User not found' }],
    }),
  });

  await expect(fetchUserContributions('ghost', 'token')).rejects.toThrow(
    'User not found',
  );
});

test('fetchUserContributions throws on rate limit', async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      errors: [{ message: 'rate limit exceeded' }],
    }),
  });

  await expect(fetchUserContributions('octocat', 'token')).rejects.toThrow(
    'Rate limit exceeded',
  );
});