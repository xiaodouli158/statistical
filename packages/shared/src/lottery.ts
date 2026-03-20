import { LOTTERY_TYPES } from "./constants";
import type { LotteryType } from "./types";

export const DEFAULT_LOTTERY_TYPE: LotteryType = "macau";

export const LOTTERY_LABELS: Record<LotteryType, string> = {
  macau: "新澳门彩",
  hongkong: "香港彩"
};

export const LOTTERY_API_KEYS: Record<LotteryType, string> = {
  macau: "newMacau",
  hongkong: "hk"
};

export const HONGKONG_DRAW_WEEKDAYS = [2, 4, 6] as const;

export function normalizeLotteryType(input: string | null | undefined): LotteryType {
  return LOTTERY_TYPES.includes(input as LotteryType) ? (input as LotteryType) : DEFAULT_LOTTERY_TYPE;
}
