import {
  NUMBER_ORDER_NATURAL,
  getNumbersForParityCategory,
  getNumbersForSizeCategory,
  getNumbersForWaveColor,
  getNumbersForZodiac,
  getNumbersForZodiacGroup,
  type ZodiacName
} from "@statisticalsystem/shared";
import { extractZodiacs, normalizeZodiacName } from "./zodiac";
import { normalizeNumberToken } from "./text";

type TemaFilterGroup = "selection" | "wave" | "parity" | "size" | "zodiacGroup";

type TemaFilterEntry = {
  alias: string;
  label: string;
  group: Exclude<TemaFilterGroup, "selection">;
  resolve: (referenceDate: string | null | undefined) => string[];
};

type ResolvedFilter = {
  group: TemaFilterGroup;
  values: string[];
};

export type ResolvedTemaSubject = {
  directNumbers: string[];
  directZodiacs: ZodiacName[];
  values: string[];
  uniqueValues: string[];
  usesFilterGroups: boolean;
  hasRecognizedContent: boolean;
};

const TEMA_FILTER_ENTRIES: TemaFilterEntry[] = [
  {
    alias: "家肖",
    label: "家肖",
    group: "zodiacGroup",
    resolve: (referenceDate: string | null | undefined) => getNumbersForZodiacGroup("家肖", referenceDate)
  },
  {
    alias: "家畜",
    label: "家肖",
    group: "zodiacGroup",
    resolve: (referenceDate: string | null | undefined) => getNumbersForZodiacGroup("家畜", referenceDate)
  },
  {
    alias: "野肖",
    label: "野肖",
    group: "zodiacGroup",
    resolve: (referenceDate: string | null | undefined) => getNumbersForZodiacGroup("野肖", referenceDate)
  },
  {
    alias: "野兽",
    label: "野肖",
    group: "zodiacGroup",
    resolve: (referenceDate: string | null | undefined) => getNumbersForZodiacGroup("野兽", referenceDate)
  },
  {
    alias: "红波",
    label: "红波",
    group: "wave",
    resolve: () => getNumbersForWaveColor("red")
  },
  {
    alias: "蓝波",
    label: "蓝波",
    group: "wave",
    resolve: () => getNumbersForWaveColor("blue")
  },
  {
    alias: "绿波",
    label: "绿波",
    group: "wave",
    resolve: () => getNumbersForWaveColor("green")
  },
  {
    alias: "红",
    label: "红波",
    group: "wave",
    resolve: () => getNumbersForWaveColor("red")
  },
  {
    alias: "蓝",
    label: "蓝波",
    group: "wave",
    resolve: () => getNumbersForWaveColor("blue")
  },
  {
    alias: "绿",
    label: "绿波",
    group: "wave",
    resolve: () => getNumbersForWaveColor("green")
  },
  {
    alias: "单数",
    label: "单数",
    group: "parity",
    resolve: () => getNumbersForParityCategory("单")
  },
  {
    alias: "双数",
    label: "双数",
    group: "parity",
    resolve: () => getNumbersForParityCategory("双")
  },
  {
    alias: "单",
    label: "单数",
    group: "parity",
    resolve: () => getNumbersForParityCategory("单")
  },
  {
    alias: "双",
    label: "双数",
    group: "parity",
    resolve: () => getNumbersForParityCategory("双")
  },
  {
    alias: "大数",
    label: "大数",
    group: "size",
    resolve: () => getNumbersForSizeCategory("大")
  },
  {
    alias: "小数",
    label: "小数",
    group: "size",
    resolve: () => getNumbersForSizeCategory("小")
  },
  {
    alias: "大",
    label: "大数",
    group: "size",
    resolve: () => getNumbersForSizeCategory("大")
  },
  {
    alias: "小",
    label: "小数",
    group: "size",
    resolve: () => getNumbersForSizeCategory("小")
  }
];

TEMA_FILTER_ENTRIES.sort((left, right) => right.alias.length - left.alias.length);

function uniqueValues<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function orderNatural(values: Iterable<string>): string[] {
  const valueSet = new Set(values);
  return NUMBER_ORDER_NATURAL.filter((number) => valueSet.has(number));
}

function intersectNumberSets(left: Set<string>, right: Set<string>): Set<string> {
  return new Set([...left].filter((value) => right.has(value)));
}

function collectResolvedFilters(subject: string, referenceDate: string | null | undefined): ResolvedFilter[] {
  const compact = subject.replace(/[\s,，、。.;；:：()（）]/g, "");
  const seen = new Set<string>();
  const grouped = new Map<ResolvedFilter["group"], Set<string>>();

  let index = 0;

  while (index < compact.length) {
    const char = compact[index] ?? "";

    if (/\d/.test(char)) {
      while (/\d/.test(compact[index] ?? "")) {
        index += 1;
      }

      continue;
    }

    if (normalizeZodiacName(char)) {
      index += 1;
      continue;
    }

    const match = TEMA_FILTER_ENTRIES.find((entry) => compact.startsWith(entry.alias, index));

    if (!match) {
      index += 1;
      continue;
    }

    const filterKey = `${match.group}:${match.label}`;

    if (!seen.has(filterKey)) {
      seen.add(filterKey);

      const current = grouped.get(match.group) ?? new Set<string>();

      for (const value of match.resolve(referenceDate)) {
        current.add(value);
      }

      grouped.set(match.group, current);
    }

    index += match.alias.length;
  }

  return Array.from(grouped.entries()).map(([group, values]) => ({
    group,
    values: orderNatural(values)
  }));
}

export function resolveTemaSubject(subject: string, referenceDate: string | null | undefined): ResolvedTemaSubject {
  const directNumbers = Array.from(subject.matchAll(/\d{1,2}/g)).map(([value]) => normalizeNumberToken(value));
  const directZodiacs = extractZodiacs(subject);
  const directZodiacNumbers = uniqueValues(directZodiacs.flatMap((zodiac) => getNumbersForZodiac(zodiac, referenceDate)));
  const resolvedFilters = collectResolvedFilters(subject, referenceDate);
  const hasDirectSelection = directNumbers.length > 0 || directZodiacNumbers.length > 0;
  const usesFilterGroups = resolvedFilters.length > 0;

  if (!hasDirectSelection && !usesFilterGroups) {
    return {
      directNumbers,
      directZodiacs,
      values: [],
      uniqueValues: [],
      usesFilterGroups,
      hasRecognizedContent: false
    };
  }

  if (!usesFilterGroups) {
    const uniqueDirectNumbers = uniqueValues(directNumbers);
    const appendedZodiacNumbers = directZodiacNumbers.filter((value) => !uniqueDirectNumbers.includes(value));
    const uniqueValuesForDisplay = uniqueValues([...uniqueDirectNumbers, ...directZodiacNumbers]);

    return {
      directNumbers,
      directZodiacs,
      values: directNumbers.length > 0 ? [...directNumbers, ...appendedZodiacNumbers] : [...directZodiacNumbers],
      uniqueValues: uniqueValuesForDisplay,
      usesFilterGroups,
      hasRecognizedContent: true
    };
  }

  const groupedSets: Set<string>[] = resolvedFilters.map((filter) => new Set(filter.values));

  if (hasDirectSelection) {
    groupedSets.unshift(new Set([...directNumbers, ...directZodiacNumbers]));
  }

  let resolvedSet = groupedSets[0] ?? new Set<string>();

  for (const current of groupedSets.slice(1)) {
    resolvedSet = intersectNumberSets(resolvedSet, current);
  }

  return {
    directNumbers,
    directZodiacs,
    values: orderNatural(resolvedSet),
    uniqueValues: orderNatural(resolvedSet),
    usesFilterGroups,
    hasRecognizedContent: true
  };
}
