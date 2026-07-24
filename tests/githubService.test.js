// tests/githubService.test.js
const {
  buildContributionQuery,
  parseContributionCalendar,
  fetchGraphQL,
} = require('../src/services/githubService');

// --------------------------------------------------
// buildContributionQuery
// --------------------------------------------------
test('buildContributionQuery returns a GraphQL query with correct dates', () => {
  const q = buildContributionQuery('octocat', 2023);
  expect(q).toContain('user(login: "octocat")');
  expect(q).toContain('from: "2023-01-01T00:00:00Z"');
  expect(q).toContain('to: "2023-12-31T23:59:59Z"');
});

// --------------------------------------------------
// parseContributionCalendar
// --------------------------------------------------
test('parseContributionCalendar extracts contribution counts', () => {
  const userData = {
    contributionsCollection: {
      contributionCalendar: {
        weeks: [
          {
            contributionDays: [
              { date: '2023-01-01', contributionCount: 3 },
              { date: '2023-01-02', contributionCount: 0 },
            ],
          },
        ],
      },
    },
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = parseContributionCalendar(userData, 2023);
  // only dates <= today (or tomorrow if count>0) are kept
  expect(result['2023-01-01']).toBe(3);
  expect(result['2023-01-02']).toBe(0);
});

test('parseContributionCalendar returns empty object when calendar missing', () => {
  expect(parseContributionCalendar({}, 2023)).toEqual({});
  expect(parseContributionCalendar(null, 2023)).toEqual({});
});

// --------------------------------------------------
// fetchGraphQL (mocked fetch)
// --------------------------------------------------
global.fetch = jest.fn();

beforeEach(() => {
  fetch.mockReset();
});

test('fetchGraphQL throws on non‑ok response', async () => {
  fetch.mockResolvedValueOnce({
    ok: false,
    status: 500,
    text: async () => 'Internal Server Error',
  });

  await expect(fetchGraphQL('query', 'token')).rejects.toThrow(
    'GitHub API error: 500 Internal Server Error',
  );
});

test('fetchGraphQL throws on GraphQL errors', async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      errors: [{ message: 'Something went wrong', type: 'NOT_FOUND' }],
    }),
  });

  await expect(fetchGraphQL('query', 'token')).rejects.toThrow(
    'User not found',
  );
});

test('fetchGraphQL returns user data on success', async () => {
  const user = { login: 'octocat', createdAt: '2011-01-01T00:00:00Z' };
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: { user } }),
  });

  const data = await fetchGraphQL('query', 'token');
  expect(data).toEqual(user);
});