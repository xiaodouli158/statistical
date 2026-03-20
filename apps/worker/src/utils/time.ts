import { BUSINESS_DAY_START_HOUR, HONGKONG_DRAW_WEEKDAYS, type LotteryType } from "@statisticalsystem/shared";

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

function createBeijingDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day) - BEIJING_OFFSET_MS);
}

function formatBeijingDate(date: Date): string {
  const parts = getBeijingParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function normalizeDateOnly(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function getBusinessDate(date = new Date()): Date {
  const parts = getBeijingParts(date);
  const currentUtc = date.getTime();
  const currentBeijingMidnightUtc = Date.UTC(parts.year, parts.month - 1, parts.day) - BEIJING_OFFSET_MS;
  return parts.hour < BUSINESS_DAY_START_HOUR ? new Date(currentBeijingMidnightUtc - ONE_DAY_MS) : new Date(currentUtc);
}

function getBeijingWeekday(date: Date): number {
  return toBeijingDate(date).getUTCDay();
}

function computeMacauExpectForDate(date: Date): string {
  const parts = getBeijingParts(date);
  const doy = dayOfYear(parts.year, parts.month, parts.day);
  return `${parts.year}${String(doy).padStart(3, "0")}`;
}

function computeHongkongExpectForDate(date: Date): string {
  const targetParts = getBeijingParts(date);
  let count = 0;
  let cursor = createBeijingDate(targetParts.year, 1, 1);

  while (formatBeijingDate(cursor) <= formatBeijingDate(date)) {
    if (isLotteryDrawDay("hongkong", cursor)) {
      count += 1;
    }

    cursor = new Date(cursor.getTime() + ONE_DAY_MS);
  }

  return `${targetParts.year}${String(count).padStart(3, "0")}`;
}

function getNextHongkongDrawDate(date: Date): Date {
  let cursor = createBeijingDate(getBeijingParts(date).year, getBeijingParts(date).month, getBeijingParts(date).day);

  while (!isLotteryDrawDay("hongkong", cursor)) {
    cursor = new Date(cursor.getTime() + ONE_DAY_MS);
  }

  return cursor;
}

export function formatNowIso(date = new Date()): string {
  return date.toISOString();
}

export function getBeijingDateString(date = new Date()): string {
  return formatBeijingDate(date);
}

export function normalizeMemberExpiresOn(value: string | null | undefined): string | null {
  return normalizeDateOnly(value);
}

export function isMembershipExpired(memberExpiresOn: string | null | undefined, date = new Date()): boolean {
  const normalized = normalizeDateOnly(memberExpiresOn);

  if (!normalized) {
    return false;
  }

  return normalized < getBeijingDateString(date);
}

export function isLotteryDrawDay(lotteryType: LotteryType, date = new Date()): boolean {
  if (lotteryType === "macau") {
    return true;
  }

  return HONGKONG_DRAW_WEEKDAYS.includes(getBeijingWeekday(date) as (typeof HONGKONG_DRAW_WEEKDAYS)[number]);
}

export function computeExpectForMail(date = new Date(), lotteryType: LotteryType): string {
  const businessDate = getBusinessDate(date);

  if (lotteryType === "hongkong") {
    return computeHongkongExpectForDate(getNextHongkongDrawDate(businessDate));
  }

  return computeMacauExpectForDate(businessDate);
}

export function isCurrentDrawResult(lotteryType: LotteryType, openTime: string, date = new Date()): boolean {
  if (!isLotteryDrawDay(lotteryType, date)) {
    return false;
  }

  return openTime.slice(0, 10) === formatBeijingDate(date);
}

export function getActiveLotteries(date = new Date()): LotteryType[] {
  const result: LotteryType[] = ["macau"];

  if (isLotteryDrawDay("hongkong", date)) {
    result.push("hongkong");
  }

  return result;
}

export function getBeijingWindowStatus(date = new Date()): "before" | "inside" | "after" {
  const parts = getBeijingParts(date);
  const minuteOfDay = parts.hour * 60 + parts.minute;
  const start = 21 * 60 + 30;
  const end = 21 * 60 + 40;

  if (minuteOfDay < start) {
    return "before";
  }

  if (minuteOfDay > end || (minuteOfDay === end && parts.second > 0)) {
    return "after";
  }

  return "inside";
}
