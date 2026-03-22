import { NUMBER_ORDER_NATURAL, ZODIAC_SEQUENCE } from "./constants";
import type { WaveColor, ZodiacName } from "./types";

export type SizeCategoryName = "大" | "小";

export type ParityCategoryName = "单" | "双";

export type ZodiacGroupName = "家肖" | "野肖";

export type FiveElementName = "金" | "木" | "水" | "火" | "土";

export const CHINESE_NEW_YEAR_START: Record<number, string> = {
  2020: "2020-01-25",
  2021: "2021-02-12",
  2022: "2022-02-01",
  2023: "2023-01-22",
  2024: "2024-02-10",
  2025: "2025-01-29",
  2026: "2026-02-17",
  2027: "2027-02-06",
  2028: "2028-01-26",
  2029: "2029-02-13",
  2030: "2030-02-03",
  2031: "2031-01-23",
  2032: "2032-02-11",
  2033: "2033-01-31",
  2034: "2034-02-19",
  2035: "2035-02-08",
  2036: "2036-01-28",
  2037: "2037-02-15",
  2038: "2038-02-04",
  2039: "2039-01-24",
  2040: "2040-02-12",
  2041: "2041-02-01",
  2042: "2042-01-22",
  2043: "2043-02-10",
  2044: "2044-01-30",
  2045: "2045-02-17",
  2046: "2046-02-06",
  2047: "2047-01-26",
  2048: "2048-02-14",
  2049: "2049-02-02",
  2050: "2050-01-23",
  2051: "2051-02-11",
  2052: "2052-02-01",
  2053: "2053-02-19",
  2054: "2054-02-08",
  2055: "2055-01-28",
  2056: "2056-02-15",
  2057: "2057-02-04",
  2058: "2058-01-24",
  2059: "2059-02-12",
  2060: "2060-02-02",
  2061: "2061-01-21",
  2062: "2062-02-09",
  2063: "2063-01-29",
  2064: "2064-02-17",
  2065: "2065-02-05",
  2066: "2066-01-26",
  2067: "2067-02-14",
  2068: "2068-02-03",
  2069: "2069-01-23",
  2070: "2070-02-11",
  2071: "2071-01-31",
  2072: "2072-02-19",
  2073: "2073-02-07",
  2074: "2074-01-27",
  2075: "2075-02-15",
  2076: "2076-02-05",
  2077: "2077-01-24",
  2078: "2078-02-12",
  2079: "2079-02-02",
  2080: "2080-01-22",
  2081: "2081-02-09",
  2082: "2082-01-29",
  2083: "2083-02-17",
  2084: "2084-02-06",
  2085: "2085-01-26",
  2086: "2086-02-14",
  2087: "2087-02-03",
  2088: "2088-01-24",
  2089: "2089-02-10",
  2090: "2090-01-30",
  2091: "2091-02-18",
  2092: "2092-02-07",
  2093: "2093-01-27",
  2094: "2094-02-15",
  2095: "2095-02-05",
  2096: "2096-01-25",
  2097: "2097-02-12",
  2098: "2098-02-01",
  2099: "2099-01-21",
  2100: "2100-02-09"
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

export const BASE_ELEMENT_NUMBER_MAP: Record<FiveElementName, string[]> = {
  金: ["03", "04", "11", "12", "25", "26", "33", "34", "41", "42"],
  木: ["07", "08", "15", "16", "23", "24", "37", "38", "45", "46"],
  水: ["13", "14", "21", "22", "29", "30", "43", "44"],
  火: ["01", "02", "09", "10", "17", "18", "31", "32", "39", "40", "47", "48"],
  土: ["05", "06", "19", "20", "27", "28", "35", "36", "49"]
};

const ELEMENT_BASE_YEAR = 2025;

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

function shiftNumberWithinRange(number: string, offset: number): string {
  let result = Number(number) + offset;

  while (result > 49) {
    result -= 49;
  }

  while (result < 1) {
    result += 49;
  }

  return String(result).padStart(2, "0");
}

export function getNumbersForElement(element: FiveElementName, input: string | null | undefined): string[] {
  const lunarYear = resolveZodiacAnchorYear(input);
  const shift = lunarYear - ELEMENT_BASE_YEAR;

  return BASE_ELEMENT_NUMBER_MAP[element]
    .map((number) => shiftNumberWithinRange(number, shift))
    .sort((left, right) => Number(left) - Number(right));
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
