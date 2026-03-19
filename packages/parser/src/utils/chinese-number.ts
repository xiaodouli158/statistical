const DIGITS: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9
};

const UNITS: Record<string, number> = {
  十: 10,
  百: 100,
  千: 1000
};

export function parseChineseNumber(input: string): number | null {
  const value = input.trim();

  if (!value) {
    return null;
  }

  if (/^\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  let total = 0;
  let current = 0;

  for (const char of value) {
    if (char in DIGITS) {
      current = DIGITS[char] ?? 0;
      continue;
    }

    if (char in UNITS) {
      const unit = UNITS[char] ?? 1;
      total += (current || 1) * unit;
      current = 0;
    }
  }

  total += current;

  return Number.isFinite(total) && total > 0 ? total : null;
}
