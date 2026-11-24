// Shared HR business rules, used by both the API and the pages so the numbers
// are always computed the same way.

/** Currency used across the whole app. Change it here only (e.g. "MAD"). */
export const CURRENCY = "EUR";
export const LOCALE = "fr-FR";

/** Legal monthly hours for a full-time job in France (35h/week). */
export const MONTHLY_HOURS = 151.67;
/** Overtime premium (+25%). */
export const OVERTIME_RATE = 1.25;

export const LEAVE_TYPES = ["vacation", "sick", "other"];
export const CONTRACT_TYPES = ["CDI", "CDD", "alternance", "stage", "freelance"];
export const ROLES = ["employee", "admin"];

export function formatMoney(value, { decimals = 2 } = {}) {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value) || 0);
}

export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseDate(value) {
  // "YYYY-MM-DD" parsed as a local date (avoids time-zone off-by-one errors)
  const [y, m, d] = String(value).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Number of working days (Mon–Fri) between two dates, both included. */
export function workingDays(start, end) {
  const s = parseDate(start);
  const e = parseDate(end);
  if (!s || !e || e < s) return 0;
  let days = 0;
  for (const d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) days++;
  }
  return days;
}

/** Only approved leaves count as absence. */
export function approvedLeaveDays(emp) {
  return (emp.attendance_leave?.history_of_leaves || [])
    .filter((l) => l.status === "approved")
    .reduce((sum, l) => sum + workingDays(l.start_date, l.end_date), 0);
}

export function absenteeismRate(emp) {
  const workDays = toNumber(emp.profile?.work_days_per_year, 220) || 220;
  return (approvedLeaveDays(emp) / workDays) * 100;
}

/** Monthly payroll breakdown for one employee. */
export function computePay(payroll = {}) {
  const salary = toNumber(payroll.salary_amount);
  const overtimeHours = toNumber(payroll.overtime_hours);
  const bonuses = toNumber(payroll.bonuses);
  const deductions = toNumber(payroll.deductions);
  const hourlyRate = salary / MONTHLY_HOURS;
  const overtimePay = Math.round(hourlyRate * OVERTIME_RATE * overtimeHours * 100) / 100;
  const gross = Math.round((salary + overtimePay + bonuses) * 100) / 100;
  const net = Math.round((gross - deductions) * 100) / 100;
  return { salary, overtimeHours, overtimePay, bonuses, deductions, hourlyRate, gross, net };
}

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
