const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const shortDateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const formatDate = (iso: string) => dateFormatter.format(new Date(iso));
export const formatPrice = (value: number) => currencyFormatter.format(value);

/** "12 – 19 Nov 2026" style range; falls back to full dates across months/years. */
export function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (start.getUTCFullYear() !== end.getUTCFullYear()) return `${formatDate(startIso)} – ${formatDate(endIso)}`;
  return `${shortDateFormatter.format(start)} – ${dateFormatter.format(end)}`;
}

export const nightsBetween = (startIso: string, endIso: string) =>
  Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 86_400_000));

export type TripStatus = "upcoming" | "active" | "past";

export function tripStatus(startIso: string, endIso: string, now = new Date()): TripStatus {
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (new Date(startIso).getTime() > now.getTime()) return "upcoming";
  if (new Date(endIso).getTime() >= startOfToday) return "active";
  return "past";
}

/** "2026-11-12" for <input type="date"> from an ISO timestamp (UTC). */
export const toDateInput = (iso: string) => iso.slice(0, 10);

export const todayInput = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().slice(0, 10);
};
