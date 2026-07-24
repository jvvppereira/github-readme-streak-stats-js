// tests/card.test.js
const {
  generateCard,
  formatDate,
  formatNumber,
  getTheme,
  getLocale,
} = require('../src/card');

describe('formatNumber', () => {
  test('plain number without short flag', () => {
    expect(formatNumber(12345, false)).toBe('12,345');
  });
  test('short flag produces k / M', () => {
    expect(formatNumber(1500, true)).toBe('1.5k');
    expect(formatNumber(1_500_000, true)).toBe('1.5M');
    expect(formatNumber(900, true)).toBe('900');
  });
});

describe('formatDate', () => {
  const iso = '2026-06-23T00:00:00';

  test('default locale format (en-US short month)', () => {
    const out = formatDate(iso, 'en-US');
    expect(out).toMatch(/Jun\s23,\s2026/);
  });

  test('custom format with tokens', () => {
    const out = formatDate(iso, 'en-US', 'D MMM YYYY');
    expect(out).toBe('23 Jun 2026');
  });

  test('fallback to en-US when locale unsupported', () => {
    const out = formatDate(iso, 'xx-YY', 'YYYY-MM-DD');
    expect(out).toBe('2026-06-23');
  });

  test('empty string returns empty', () => {
    expect(formatDate('', 'en-US')).toBe('');
  });
});

describe('getTheme / getLocale fallback', () => {
  test('unknown theme falls back to default', () => {
    expect(getTheme('not-exist')).toEqual(getTheme('default'));
  });
  test('unknown locale falls back to en', () => {
    expect(getLocale('zz')).toEqual(getLocale('en'));
  });
});

describe('generateCard', () => {
  const baseStats = {
    totalContributions: 120,
    currentStreak: 5,
    currentStreakStart: '2026-06-19',
    currentStreakEnd: '2026-06-23',
    longestStreak: 12,
    longestStreakStart: '2025-01-01',
    longestStreakEnd: '2025-01-12',
    firstContribution: '2020-03-01',
  };

  test('produces an SVG string with expected root attributes', () => {
    const svg = generateCard(baseStats, 495, 195, { locale: 'en', theme: 'default' });
    expect(svg).toContain('<svg');
    expect(svg).toContain('width="495"');
    expect(svg).toContain('height="195"');
    expect(svg).toContain('GitHub Streak Stats');
  });

  test('includes three column numbers', () => {
    const svg = generateCard(baseStats, 495, 195, {});
    expect(svg).toContain('>120<'); // total
    expect(svg).toContain('>5<'); // current
    expect(svg).toContain('>12<'); // longest
  });

  test('respects hide_* options', () => {
    const svg = generateCard(baseStats, 495, 195, {
      hide_total_contributions: true,
      hide_current_streak: true,
      hide_longest_streak: true,
    });
    expect(svg).not.toContain('>120<');
    expect(svg).not.toContain('>5<');
    expect(svg).not.toContain('>12<');
  });

  test('date_format token MMM works', () => {
    const svg = generateCard(baseStats, 495, 195, {
      date_format: 'D MMM YYYY',
    });
    expect(svg).toMatch(/\d{1,2}\s[A-Za-z]{3}\s2026/);
  });
});