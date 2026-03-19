import { getNumbersForZodiac, getZodiacForNumber, type ZodiacName } from "@statisticalsystem/shared";
import { TRADITIONAL_TO_SIMPLIFIED_ZODIAC } from "../constants/zodiac";

export function normalizeZodiacName(input: string): ZodiacName | null {
  const char = input.trim();
  return TRADITIONAL_TO_SIMPLIFIED_ZODIAC[char] ?? null;
}

export function extractZodiacs(text: string): ZodiacName[] {
  const result: ZodiacName[] = [];

  for (const char of text) {
    const zodiac = normalizeZodiacName(char);

    if (zodiac) {
      result.push(zodiac);
    }
  }

  return Array.from(new Set(result));
}

export { getNumbersForZodiac, getZodiacForNumber };
