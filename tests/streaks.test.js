// tests/streaks.test.js
const { calculateStreaks } = require('../src/streaks');

const makeContrib = (days) => {
  const obj = {};
  days.forEach((d) => (obj[d] = 1));
  return obj;
};

describe('calculateStreaks – daily mode', () => {
  test('empty contributions returns zeros', () => {
    const r = calculateStreaks({});
    expect(r.totalContributions).toBe(0);
    expect(r.currentStreak.length).toBe(0);
    expect(r.longestStreak.length).toBe(0);
    expect(r.firstContribution).toBeNull();
  });

  test('single contribution day', () => {
    const r = calculateStreaks(makeContrib(['2023-05-10']));
    expect(r.totalContributions).toBe(1);
    expect(r.currentStreak.length).toBe(1);
    expect(r.currentStreak.start).toBe('2023-05-10');
    expect(r.currentStreak.end).toBe('2023-05-10');
    expect(r.longestStreak.length).toBe(1);
    expect(r.firstContribution).toBe('2023-05-10');
  });

  test('consecutive days build a streak', () => {
    const days = ['2023-05-01', '2023-05-02', '2023-05-03'];
    const r = calculateStreaks(makeContrib(days));
    expect(r.currentStreak.length).toBe(3);
    expect(r.longestStreak.length).toBe(3);
    expect(r.currentStreak.start).toBe('2023-05-01');
    expect(r.currentStreak.end).toBe('2023-05-03');
  });

  test('gap resets current streak but longest remains', () => {
    const days = ['2023-05-01', '2023-05-02', '2023-05-05', '2023-05-06'];
    const r = calculateStreaks(makeContrib(days));
    expect(r.currentStreak.length).toBe(2); // last two days
    expect(r.longestStreak.length).toBe(2); // first two also length 2
    expect(r.firstContribution).toBe('2023-05-01');
  });
});

describe('calculateStreaks – weekly mode', () => {
  test('counts a week with any contribution as a streak unit', () => {
    const contrib = {
      '2023-05-01': 2, // week 1
      '2023-05-09': 1, // week 2
      '2023-05-15': 3, // week 3
    };
    const r = calculateStreaks(contrib, 'weekly');
    expect(r.currentStreak.length).toBe(3);
    expect(r.longestStreak.length).toBe(3);
    expect(r.firstContribution).toBe('2023-05-01');
  });

  test('week without contributions breaks streak', () => {
    const contrib = {
      '2023-05-01': 1, // week 1
      // week 2 empty
      '2023-05-15': 1, // week 3
    };
    const r = calculateStreaks(contrib, 'weekly');
    expect(r.currentStreak.length).toBe(1);
    expect(r.longestStreak.length).toBe(1);
  });
});