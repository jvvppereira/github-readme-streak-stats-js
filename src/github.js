const { fetchGraphQL, buildContributionQuery, parseContributionCalendar } = require('./services/githubService');

async function fetchUserContributions(username, token) {
  const currentYear = new Date().getFullYear();

  // First fetch current year to get user creation date
  const currentYearUser = await fetchGraphQL(buildContributionQuery(username, currentYear), token);
  const createdAt = currentYearUser?.createdAt;

  if (!createdAt) {
    throw new Error('Failed to retrieve user creation date');
  }

  const userCreatedYear = new Date(createdAt).getFullYear();
  const actualMinYear = Math.max(userCreatedYear, 2005);

  // Get contribution years from current year data
  const contributionYears = currentYearUser?.contributionsCollection?.contributionYears || [];
  const firstContributionYear = contributionYears.length > 0
    ? contributionYears[contributionYears.length - 1]
    : userCreatedYear;

  // Build list of years to fetch
  const yearsToFetch = new Set();

  // Add first contribution year if before 2005
  if (firstContributionYear < 2005) {
    yearsToFetch.add(firstContributionYear);
  }

  // Add all years from actualMinYear to currentYear - 1
  for (let y = actualMinYear; y < currentYear; y++) {
    yearsToFetch.add(y);
  }

  // Fetch all years in parallel
  const contributions = { ...parseContributionCalendar(currentYearUser, currentYear) };

  const promises = Array.from(yearsToFetch).map(async (year) => {
    try {
      const userData = await fetchGraphQL(buildContributionQuery(username, year), token);
      return { year, data: parseContributionCalendar(userData, year) };
    } catch (err) {
      console.error(`Failed to fetch ${year} contributions:`, err.message);
      return { year, data: {} };
    }
  });

  const results = await Promise.all(promises);
  for (const { data } of results) {
    Object.assign(contributions, data);
  }

  return contributions;
}

module.exports = { fetchUserContributions, fetchGraphQL, buildContributionQuery, parseContributionCalendar };