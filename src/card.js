const fs = require('fs');
const path = require('path');

const THEMES = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets', 'themes.json'), 'utf8'));
const LOCALES = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets', 'locales.json'), 'utf8'));

function getTheme(themeName) {
  return THEMES[themeName] || THEMES.default;
}

function getLocale(locale) {
  return LOCALES[locale] || LOCALES.en;
}

function parseColor(color) {
  if (!color) return null;
  if (color.startsWith('#')) return color;
  if (color.includes(',')) {
    const parts = color.split(',');
    if (parts.length >= 3) {
      return `linear-gradient(${parts.join(',')})`;
    }
  }
  if (/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(color)) {
    return '#' + color;
  }
  return color;
}

function formatNumber(num, short) {
  const n = Number(num) || 0;
  if (!short) return n.toLocaleString();
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

/**
 * Format a date string (YYYY-MM-DD) according to a custom format or locale default.
 *
 * Supported tokens in `dateFormat`:
 *   YYYY  – full year (e.g. 2026)
 *   YY    – two‑digit year (e.g. 26)
 *   MMM   – short month name in the given locale (e.g. Jun)
 *   MM    – zero‑padded month (01‑12)
 *   M     – month number (1‑12)
 *   DD    – zero‑padded day (01‑31)
 *   D     – day number (1‑31)
 *
 * If `dateFormat` is omitted or falsy the locale default format
 * (e.g. "Jun 23, 2026" for en‑US) is used.
 *
 * Example of the new preset format "D MMM YYYY" → "23 Jun 2026".
 */
function formatDate(dateStr, locale, dateFormat) {
  if (!dateStr) return '';
  const parts = dateStr.split('T')[0].split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  const date = new Date(year, month - 1, day);

  // If a custom format string is supplied, replace supported tokens.
  if (dateFormat) {
    const monthShort = date.toLocaleDateString(locale, { month: 'short' });
    return dateFormat
      .replace('YYYY', year.toString())
      .replace('YY', year.toString().slice(2))
      .replace('MMM', monthShort)
      .replace('MM', month.toString().padStart(2, '0'))
      .replace('M', month.toString())
      .replace('DD', day.toString().padStart(2, '0'))
      .replace('D', day.toString());
  }

  // Default: locale short month, day, year (e.g. "Jun 23, 2026" for en‑US)
  try {
    return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

function generateCard(stats, cardWidth = 495, cardHeight = 190, options = {}) {
  const {
    theme = 'default',
    hide_border = false,
    border_radius = 4.5,
    background,
    border,
    stroke,
    ring,
    fire,
    currStreakNum,
    sideNums,
    currStreakLabel,
    sideLabels,
    dates,
    excludeDaysLabel,
    date_format,
    locale = 'en',
    short_numbers = false,
    hide_total_contributions = false,
    hide_current_streak = false,
    hide_longest_streak = false,
    mode = 'daily'
  } = options;

  const themeColors = getTheme(theme);
  const localeData = getLocale(locale);
  const isWeekly = mode === 'weekly';

  const colors = {
    title_color: parseColor(currStreakNum || themeColors.title_color),
    text_color: parseColor(themeColors.text_color),
    icon_color: parseColor(themeColors.icon_color),
    bg_color: parseColor(background || themeColors.bg_color),
    border_color: parseColor(border || themeColors.border_color),
    ring_color: parseColor(ring || themeColors.ring_color),
    curr_streak_num: parseColor(currStreakNum || themeColors.curr_streak_num),
    curr_streak_label: parseColor(currStreakLabel || themeColors.curr_streak_label),
    side_num: parseColor(sideNums || themeColors.side_num),
    side_labels: parseColor(sideLabels || themeColors.side_labels),
    dates: parseColor(dates || themeColors.dates),
    stroke: parseColor(stroke || themeColors.stroke),
    fire_color: parseColor(themeColors.fire_color)
  };

  const radius = Math.max(0, Math.min(248, border_radius));
  const colWidth = cardWidth / 3;
  const showBorder = !hide_border;

  const borderAttr = showBorder
    ? `stroke="${colors.border_color}" stroke-width="1"`
    : '';

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}" role="img" aria-label="GitHub Streak Stats">`;

  svg += `<style>
    .stitle { font: 600 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${colors.title_color} }
    .snum { font: 600 28px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${colors.side_num} }
    .scurr { font: 600 28px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${colors.curr_streak_num} }
    .slong { font: 600 28px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${colors.side_num} }
    .slabel { font: 400 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${colors.side_labels} }
    .scurrlabel { font: 600 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${colors.ring_color} }
    .sdate { font: 400 11px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${colors.dates} }
    .excluded { font: 400 11px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${colors.dates} }
    .sring { fill: none; stroke: ${colors.ring_color}; stroke-width: 5; stroke-linecap: round; }
    .fire { font: 600 15px 'Segoe UI', Ubuntu, Sans-Serif; fill: ${colors.fire_color}; text-anchor: middle; }
  </style>`;

  // Background
  svg += `<rect x="0.5" y="0.5" width="${cardWidth - 1}" height="${cardHeight - 1}" rx="${radius}" ry="${radius}" fill="${colors.bg_color}" ${borderAttr} />`;

  // Vertically center the three‑column block (number, label, date).
  // The block spans ~50 px from the number baseline to the date baseline.
  const yOffset = Math.round((cardHeight - 80) / 2);

  // Three columns
  const columns = [
    {
      key: 'total',
      label: localeData.total,
      value: formatNumber(stats.totalContributions, short_numbers),
      colorClass: 'snum',
      labelColorClass: 'slabel',
      hide: hide_total_contributions
    },
    {
      key: 'current',
      label: isWeekly ? localeData.currentWeekly : localeData.current,
      value: formatNumber(stats.currentStreak, short_numbers),
      colorClass: 'snum',
      labelColorClass: 'scurrlabel',
      hide: hide_current_streak
    },
    {
      key: 'longest',
      label: isWeekly ? localeData.longestWeekly : localeData.longest,
      value: formatNumber(stats.longestStreak, short_numbers),
      colorClass: 'slong',
      labelColorClass: 'slabel',
      hide: hide_longest_streak
    }
  ];

  columns.forEach((col, i) => {
    if (col.hide) return;

    const x = i * colWidth + colWidth / 2;
    const baseYStart = yOffset + 15;
    const yStart = baseYStart + ((i === 0 || i === 2) ? 10 : 0);

    // Ring for current streak column
    if (col.key === 'current') {
      const radius = 40;
      const circumference = 2 * Math.PI * radius;
      const ringY = yStart - 9; // center just above the number (lowered 5px)
      // Full ring (no progress dash)
      svg += `<circle class="sring" cx="${x}" cy="${ringY}" r="${radius}"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="0"
        transform="rotate(-90 ${x} ${ringY})" />`;
      // Gap mask: small circle filled with background color at the top of the ring
      const gapRadius = 8;
      svg += `<circle cx="${x}" cy="${ringY - radius}" r="${gapRadius}" fill="${colors.bg_color}" />`;
      // Fire icon at the top of the ring (inside the gap)
      const firePath = `M10.507 1.508a.75.75 0 0 1 .734-.239c3.608.829 5.433 4.783 5.003 8.321c-.166 1.376-.578 2.454-1.185 3.312l-.011.016q.206-.102.384-.218c.592-.385 1.026-.892 1.592-1.552l.211-.246a.75.75 0 0 1 1.238.151A7.25 7.25 0 1 1 8.025 8.26l.067-.068a1 1 0 0 1 .114-.094c.865-.583 1.487-1.06 1.906-1.62c.395-.529.638-1.175.638-2.154a5.7 5.7 0 0 0-.378-2.055a.75.75 0 0 1 .135-.76m1.664 1.743q.079.526.079 1.072c0 1.268-.328 2.237-.937 3.052c-.571.766-1.363 1.353-2.208 1.925l-.073.073a1 1 0 0 1-.128.103a5.75 5.75 0 1 0 8.648 3.346c-.38.411-.8.809-1.303 1.136c-.924.599-2.08.941-3.749.941a.75.75 0 0 1-.362-1.407c.679-.374 1.254-.831 1.697-1.456c.44-.624.779-1.457.92-2.626c.307-2.531-.74-5.029-2.584-6.16`;
      const scale = 15 / 24;
      const tx = x - 12 * scale;
      const ty = (ringY - radius + 4) - 12 * scale;
      svg += `<g transform="translate(${tx}, ${ty}) scale(${scale})"><path fill="${colors.fire_color}" d="${firePath}"/></g>`;
    }

    // Number
    svg += `<text x="${x}" y="${yStart}" class="${col.colorClass}" text-anchor="middle">${col.value}</text>`;

    // Label
    const labelY = col.key === 'current' ? yStart + 60 : yStart + 30;
    svg += `<text x="${x}" y="${labelY}" class="${col.labelColorClass}" text-anchor="middle">${col.label}</text>`;

    // Dates for streak columns
    if (col.key === 'total' && stats.firstContribution) {
      const dateRange = `${formatDate(stats.firstContribution, locale, date_format)} - Present`;
      svg += `<text x="${x}" y="${yStart + 50}" class="sdate" text-anchor="middle">${dateRange}</text>`;
    } else if (col.key === 'current' && stats.currentStreakStart && stats.currentStreakEnd) {
      const dateStr = stats.currentStreakStart === stats.currentStreakEnd
        ? formatDate(stats.currentStreakStart, locale, date_format)
        : `${formatDate(stats.currentStreakStart, locale, date_format)} - ${formatDate(stats.currentStreakEnd, locale, date_format)}`;
      svg += `<text x="${x}" y="${yStart + 80}" class="sdate" text-anchor="middle">${dateStr}</text>`;
    } else if (col.key === 'longest' && stats.longestStreakStart && stats.longestStreakEnd) {
      const dateStr = stats.longestStreakStart === stats.longestStreakEnd
        ? formatDate(stats.longestStreakStart, locale, date_format)
        : `${formatDate(stats.longestStreakStart, locale, date_format)} - ${formatDate(stats.longestStreakEnd, locale, date_format)}`;
      svg += `<text x="${x}" y="${yStart + 50}" class="sdate" text-anchor="middle">${dateStr}</text>`;
    }
  });

  // Dividers between columns
  for (let i = 1; i < 3; i++) {
    const x = i * colWidth;
    const dividerTop = yOffset + 15 - 40;
    const dividerBottom = yOffset + 65 + 40;
    svg += `<line x1="${x}" y1="${dividerTop}" x2="${x}" y2="${dividerBottom}" stroke="${colors.border_color}" stroke-opacity="0.2" stroke-width="1"/>`;
  }

  svg += '</svg>';
  return svg;
}

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

module.exports = { generateCard, getTheme, getLocale, formatNumber, formatDate, generateErrorCard };