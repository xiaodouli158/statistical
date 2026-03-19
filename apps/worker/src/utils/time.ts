import { BUSINESS_DAY_START_HOUR } from "@statisticalsystem/shared";

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type BeijingParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function toBeijingDate(date: Date): Date {
  return new Date(date.getTime() + BEIJING_OFFSET_MS);
}

function getBeijingParts(date: Date): BeijingParts {
  const beijing = toBeijingDate(date);

  return {
    year: beijing.getUTCFullYear(),
    month: beijing.getUTCMonth() + 1,
    day: beijing.getUTCDate(),
    hour: beijing.getUTCHours(),
    minute: beijing.getUTCMinutes(),
    second: beijing.getUTCSeconds()
  };
}

function dayOfYear(year: number, month: number, day: number): number {
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / ONE_DAY_MS) + 1;
}

export function formatNowIso(date = new Date()): string {
  return date.toISOString();
}

export function computeExpectForDraw(date = new Date()): string {
  const parts = getBeijingParts(date);
  const doy = dayOfYear(parts.year, parts.month, parts.day);
  return `${parts.year}${String(doy).padStart(3, "0")}`;
}

export function computeExpectForMail(date = new Date()): string {
  const parts = getBeijingParts(date);
  const currentUtc = date.getTime();
  const currentBeijingMidnightUtc = Date.UTC(parts.year, parts.month - 1, parts.day) - BEIJING_OFFSET_MS;
  const businessDate =
    parts.hour < BUSINESS_DAY_START_HOUR ? new Date(currentBeijingMidnightUtc - ONE_DAY_MS) : new Date(currentUtc);
  const businessParts = getBeijingParts(businessDate);
  const doy = dayOfYear(businessParts.year, businessParts.month, businessParts.day);

  return `${businessParts.year}${String(doy).padStart(3, "0")}`;
}

export function getBeijingWindowStatus(date = new Date()): "before" | "inside" | "after" {
  const parts = getBeijingParts(date);
  const minuteOfDay = parts.hour * 60 + parts.minute;
  const start = 21 * 60 + 31;
  const end = 21 * 60 + 40;

  if (minuteOfDay < start) {
    return "before";
  }

  if (minuteOfDay > end || (minuteOfDay === end && parts.second > 0)) {
    return "after";
  }

  return "inside";
}
