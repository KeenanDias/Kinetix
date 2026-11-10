import { siteConfig } from "./config";

const tz = siteConfig.timezone;

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: tz,
    ...opts,
  }).format(new Date(iso));
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit", timeZone: tz }).format(new Date(iso));
}

export function formatTimeRange(startIso: string, endIso: string) {
  return `${formatTime(startIso)} – ${formatTime(endIso)}`;
}

export function formatDateTime(iso: string) {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** YYYY-MM-DD in the org's timezone — used for grouping/filtering by day. */
export function dayKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: tz }).format(
    new Date(iso),
  );
}

/** Values for <input type="date"> and <input type="time"> in the org's timezone. */
export function zonedInputParts(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

export function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Convert a wall-clock date + time in `timeZone` to a UTC Date (DST-safe, no deps). */
export function zonedTimeToUtc(date: string, time: string, timeZone = tz): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi);
  let guess = wallAsUtc;
  for (let i = 0; i < 2; i++) {
    guess = wallAsUtc - tzOffsetMs(new Date(guess), timeZone);
  }
  return new Date(guess);
}

function tzOffsetMs(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

export function spotsLeft(s: { max_players: number; filled_spots: number }) {
  return Math.max(0, s.max_players - s.filled_spots);
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
