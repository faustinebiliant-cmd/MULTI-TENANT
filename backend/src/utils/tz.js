// ============================================================
// OSWAGO ELECTRICAL EQUIPMENT - Timezone Helper
// ============================================================

const TZ = 'Africa/Dar_es_Salaam';

// Read EAT (UTC+3) wall-clock values from a Date
const getEATParts = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false, weekday: 'short',
  });
  const map = {};
  formatter.formatToParts(date).forEach(p => { map[p.type] = p.value; });
  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour: parseInt(map.hour, 10),
    minute: parseInt(map.minute, 10),
    second: parseInt(map.second, 10),
    weekday: map.weekday,
  };
};

// Ensure a value is treated as UTC even if the string lacks a "Z"
const ensureUTC = (value) => {
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return new Date(value);
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(value);
  return new Date(hasZone ? value : value + 'Z');
};

// Build a UTC Date from EAT wall-clock (EAT = UTC+3)
const eatWallClockToUTC = (year, month, day, hour = 0, minute = 0, second = 0, ms = 0) => {
  const asUTC = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  return new Date(asUTC - 3 * 60 * 60 * 1000);
};

// Today in EAT (00:00 → 23:59:59.999)
const getTodayRangeEAT = () => {
  const t = getEATParts();
  return {
    start: eatWallClockToUTC(t.year, t.month, t.day, 0, 0, 0, 0),
    end:   eatWallClockToUTC(t.year, t.month, t.day, 23, 59, 59, 999),
  };
};

// This week in EAT (Mon 00:00 → now)
const getThisWeekRangeEAT = () => {
  const now = new Date();
  const t = getEATParts(now);
  const idx = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[t.weekday];
  if (idx === undefined) return getTodayRangeEAT();
  const mon = new Date(Date.UTC(t.year, t.month - 1, t.day - idx));
  return {
    start: eatWallClockToUTC(mon.getUTCFullYear(), mon.getUTCMonth() + 1, mon.getUTCDate(), 0, 0, 0, 0),
    end: now,
  };
};

// Specific month in EAT (1-12)
const getMonthRangeEAT = (year, month) => {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: eatWallClockToUTC(year, month, 1, 0, 0, 0, 0),
    end:   eatWallClockToUTC(year, month, last, 23, 59, 59, 999),
  };
};

// Specific year in EAT
const getYearRangeEAT = (year) => ({
  start: eatWallClockToUTC(year, 1, 1, 0, 0, 0, 0),
  end:   eatWallClockToUTC(year, 12, 31, 23, 59, 59, 999),
});

// Custom range in EAT (YYYY-MM-DD strings)
const getCustomRangeEAT = (startStr, endStr) => {
  const [sy, sm, sd] = startStr.split('-').map(n => parseInt(n, 10));
  const [ey, em, ed] = endStr.split('-').map(n => parseInt(n, 10));
  return {
    start: eatWallClockToUTC(sy, sm, sd, 0, 0, 0, 0),
    end:   eatWallClockToUTC(ey, em, ed, 23, 59, 59, 999),
  };
};

// Format a Date as YYYY-MM-DD in EAT
const formatDateEAT = (date) => {
  const t = getEATParts(date);
  return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
};

// Format "YYYY-MM-DD HH:MM AM/PM" in EAT for Excel
const formatDateTimeForExcel = (input) => {
  const date = ensureUTC(input);
  const t = getEATParts(date);
  const hour12 = t.hour % 12 === 0 ? 12 : t.hour % 12;
  const ampm = t.hour < 12 ? 'AM' : 'PM';
  return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')} ` +
         `${String(hour12).padStart(2, '0')}:${String(t.minute).padStart(2, '0')} ${ampm}`;
};

// Parse query params into an EAT-based { start, end } UTC range
const parsePeriodEAT = (query) => {
  const { year, month, startDate, endDate, period } = query;
  if (period === 'today') return getTodayRangeEAT();
  if (period === 'week')  return getThisWeekRangeEAT();
  if (year && month && month !== 'all') return getMonthRangeEAT(parseInt(year, 10), parseInt(month, 10));
  if (year) return getYearRangeEAT(parseInt(year, 10));
  if (startDate && endDate) return getCustomRangeEAT(startDate, endDate);

  const now = new Date();
  const t = getEATParts(now);
  return { start: eatWallClockToUTC(t.year, t.month, 1, 0, 0, 0, 0), end: now };
};

module.exports = {
  TZ,
  getEATParts,
  ensureUTC,
  eatWallClockToUTC,
  getTodayRangeEAT,
  getThisWeekRangeEAT,
  getMonthRangeEAT,
  getYearRangeEAT,
  getCustomRangeEAT,
  formatDateEAT,
  formatDateTimeForExcel,
  parsePeriodEAT,
};