function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
  return new Date(d.setDate(diff));
}

function calculateStreaks(contributions, mode = 'daily') {
  if (!contributions || Object.keys(contributions).length === 0) {
    return {
      totalContributions: 0,
      currentStreak: { length: 0, start: null, end: null },
      longestStreak: { length: 0, start: null, end: null },
      firstContribution: null
    };
  }

  const sortedDates = Object.keys(contributions).sort();

  let totalContributions = 0;
  let currentStreak = 0;
  let currentStreakStart = null;
  let currentStreakEnd = null;
  let longestStreak = 0;
  let longestStreakStart = null;
  let longestStreakEnd = null;
  let firstContribution = null;

  const firstDate = new Date(sortedDates[0] + 'T00:00:00');
  const lastDate = new Date(sortedDates[sortedDates.length - 1] + 'T00:00:00');

  if (mode === 'weekly') {
    // Iterate week by week (Monday start)
    let weekStart = getWeekStart(firstDate);
    const lastWeekStart = getWeekStart(lastDate);

    while (weekStart <= lastWeekStart) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      let weekContributions = 0;
      let weekHasContribution = false;

      // iterate days in week
      for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const count = contributions[dateStr] || 0;
        totalContributions += count;
        if (count > 0) {
          weekContributions += count;
          if (!firstContribution) firstContribution = dateStr;
          weekHasContribution = true;
        }
      }

      if (weekHasContribution) {
        if (currentStreak === 0) {
          currentStreakStart = weekStart.toISOString().split('T')[0];
        }
        currentStreak++;
        currentStreakEnd = weekStart.toISOString().split('T')[0];

        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
          longestStreakStart = currentStreakStart;
          longestStreakEnd = currentStreakEnd;
        }
      } else {
        currentStreak = 0;
        currentStreakStart = null;
        currentStreakEnd = null;
      }

      weekStart.setDate(weekStart.getDate() + 7);
    }
  } else {
    // daily mode (original logic)
    const currentDate = new Date(firstDate);
    while (currentDate <= lastDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const count = contributions[dateStr] || 0;
      totalContributions += count;

      if (!firstContribution && count > 0) {
        firstContribution = dateStr;
      }

      const isContributionDay = count > 0;

      if (isContributionDay) {
        if (currentStreak === 0) {
          currentStreakStart = dateStr;
        }
        currentStreak++;
        currentStreakEnd = dateStr;

        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
          longestStreakStart = currentStreakStart;
          longestStreakEnd = currentStreakEnd;
        }
      } else {
        currentStreak = 0;
        currentStreakStart = null;
        currentStreakEnd = null;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return {
    totalContributions,
    currentStreak: {
      length: currentStreak,
      start: currentStreakStart,
      end: currentStreakEnd
    },
    longestStreak: {
      length: longestStreak,
      start: longestStreakStart,
      end: longestStreakEnd
    },
    firstContribution
  };
}

module.exports = { calculateStreaks };