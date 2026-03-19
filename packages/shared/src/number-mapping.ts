import { NUMBER_ORDER_NATURAL, ZODIAC_SEQUENCE } from "./constants";
import type { WaveColor, ZodiacName } from "./types";

export const CHINESE_NEW_YEAR_START: Record<number, string> = {
  2024: "2024-02-10",
  2025: "2025-01-29",
  2026: "2026-02-17",
  2027: "2027-02-06",
  2028: "2028-01-26",
  2029: "2029-02-13",
  2030: "2030-02-03"
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

export function getSpecialDrawNumber(numbers: string[]): string | null {
  return numbers.at(-1) ?? null;
}

export function getSpecialDrawWave(waves: WaveColor[]): WaveColor | null {
  return waves.at(-1) ?? null;
}

export function getSpecialDrawZodiac(zodiacs: ZodiacName[]): ZodiacName | null {
  return zodiacs.at(-1) ?? null;
}
