import { NUMBER_ORDER_NATURAL, ZODIAC_SEQUENCE } from "./constants";
import type { WaveColor, ZodiacName } from "./types";

export type SizeCategoryName = "大" | "小";

export type ParityCategoryName = "单" | "双";

export type ZodiacGroupName = "家肖" | "野肖";

export const CHINESE_NEW_YEAR_START: Record<number, string> = {
  2024: "2024-02-10",
  2025: "2025-01-29",
  2026: "2026-02-17",
  2027: "2027-02-06",
  2028: "2028-01-26",
  2029: "2029-02-13",
  2030: "2030-02-03"
};

export const WAVE_NUMBER_MAP: Record<WaveColor, string[]> = {
  red: ["01", "02", "07", "08", "12", "13", "18", "19", "23", "24", "29", "30", "34", "35", "40", "45", "46"],
  blue: ["03", "04", "09", "10", "14", "15", "20", "25", "26", "31", "36", "37", "41", "42", "47", "48"],
  green: ["05", "06", "11", "16", "17", "21", "22", "27", "28", "32", "33", "38", "39", "43", "44", "49"]
};

export const DOMESTIC_ZODIACS: ZodiacName[] = ["牛", "马", "羊", "鸡", "狗", "猪"];

export const WILD_ZODIACS: ZodiacName[] = ZODIAC_SEQUENCE.filter((zodiac) => !DOMESTIC_ZODIACS.includes(zodiac));

export const ZODIAC_GROUP_ALIASES: Record<string, ZodiacGroupName> = {
  家肖: "家肖",
  家畜: "家肖",
  野肖: "野肖",
  野兽: "野肖"
};

export function resolveZodiacAnchorYear(input: string | null | undefined): number {
  if (!input) {
    return new Date().getUTCFullYear();
  }

  const dateText = input.slice(0, 10);
  const currentYear = Number(dateText.slice(0, 4));
  const threshold = CHINESE_NEW_YEAR_START[currentYear];

  if (!threshold) {
    return currentYear;
  }

  return dateText >= threshold ? currentYear : currentYear - 1;
}

export function getZodiacForNumber(number: string, input: string | null | undefined): ZodiacName {
  const value = Number(number);
  const anchorYear = resolveZodiacAnchorYear(input);
  const yearIndex = ((anchorYear - 2020) % 12 + 12) % 12;
  const offset = ((value - 1) % 12 + 12) % 12;
  const zodiacIndex = (yearIndex - offset + 12) % 12;
  const zodiac = ZODIAC_SEQUENCE[zodiacIndex];

  if (!zodiac) {
    throw new Error(`Invalid zodiac index for number ${number}`);
  }

  return zodiac;
}

export function getNumbersForZodiac(zodiac: ZodiacName, input: string | null | undefined): string[] {
  return NUMBER_ORDER_NATURAL.filter((number) => getZodiacForNumber(number, input) === zodiac);
}

export function getWaveColorForNumber(number: string): WaveColor | null {
  const normalized = String(Number(number)).padStart(2, "0");

  for (const wave of Object.keys(WAVE_NUMBER_MAP) as WaveColor[]) {
    if (WAVE_NUMBER_MAP[wave].includes(normalized)) {
      return wave;
    }
  }

  return null;
}

export function getNumbersForWaveColor(wave: WaveColor): string[] {
  return [...WAVE_NUMBER_MAP[wave]];
}

export function getNumbersForSizeCategory(category: SizeCategoryName): string[] {
  return NUMBER_ORDER_NATURAL.filter((number) => (category === "大" ? Number(number) >= 25 : Number(number) <= 24));
}

export function getNumbersForParityCategory(category: ParityCategoryName): string[] {
  return NUMBER_ORDER_NATURAL.filter((number) => (category === "单" ? Number(number) % 2 === 1 : Number(number) % 2 === 0));
}

export function normalizeZodiacGroupName(input: string | null | undefined): ZodiacGroupName | null {
  if (!input) {
    return null;
  }

  return ZODIAC_GROUP_ALIASES[input.trim()] ?? null;
}

export function getZodiacsForGroup(group: ZodiacGroupName | string): ZodiacName[] {
  const normalized = normalizeZodiacGroupName(group);

  if (!normalized) {
    return [];
  }

  return normalized === "家肖" ? [...DOMESTIC_ZODIACS] : [...WILD_ZODIACS];
}

export function getNumbersForZodiacGroup(group: ZodiacGroupName | string, input: string | null | undefined): string[] {
  return getZodiacsForGroup(group).flatMap((zodiac) => getNumbersForZodiac(zodiac, input));
}

export function getSpecialDrawNumber(numbers: string[]): string | null {
  return numbers.at(-1) ?? null;
}

export function getSpecialDrawWave(waves: WaveColor[]): WaveColor | null {
  return waves.at(-1) ?? null;
}

export function getSpecialDrawZodiac(zodiacs: ZodiacName[]): ZodiacName | null {
  return zodiacs.at(-1) ?? null;
}
