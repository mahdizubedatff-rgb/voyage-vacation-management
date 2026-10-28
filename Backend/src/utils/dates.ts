/** Start of the current UTC day. Vacation dates are stored as UTC midnight. */
export function startOfTodayUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Parses "YYYY-MM-DD" (or a full ISO string) into a UTC-midnight Date. */
export function toUtcDate(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
