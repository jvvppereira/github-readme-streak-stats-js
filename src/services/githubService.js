const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

function buildContributionQuery(username, year) {
  const start = `${year}-01-01T00:00:00Z`;
  const end = `${year}-12-31T23:59:59Z`;
  return `
    query {
      user(login: "${username}") {
        createdAt
        contributionsCollection(from: "${start}", to: "${end}") {
          contributionYears
          contributionCalendar {
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;
}

async function fetchGraphQL(query, token) {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'github-readme-streak-stats-js',
      'Accept': 'application/vnd.github.v4.idl'
    },
    body: JSON.stringify({ query })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} ${error}`);
  }

  const data = await response.json();

  if (data.errors) {
    const error = data.errors[0];
    if (error.type === 'NOT_FOUND') {
      throw new Error('User not found');
    }
    if (error.message?.includes('rate limit')) {
      throw new Error('Rate limit exceeded');
    }
    throw new Error(error.message || 'GraphQL error');
  }

  return data.data.user;
}

function parseContributionCalendar(userData, year) {
  const contributions = {};
  const calendar = userData?.contributionsCollection?.contributionCalendar;

  if (!calendar?.weeks) return contributions;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (const week of calendar.weeks) {
    for (const day of week.contributionDays) {
      const date = day.date;
      const count = day.contributionCount;

      const dayDate = new Date(date + 'T00:00:00');
      if (dayDate <= today || (dayDate <= tomorrow && count > 0)) {
        contributions[date] = count;
      }
    }
  }

  return contributions;
}

module.exports = { fetchGraphQL, buildContributionQuery, parseContributionCalendar };