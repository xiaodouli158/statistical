import type { NumberBarItem, ZodiacBarItem } from "@statisticalsystem/parser";
import { ZODIAC_SEQUENCE } from "@statisticalsystem/shared";

export function sortNumberBars(items: NumberBarItem[], mode: "natural" | "amountDesc"): NumberBarItem[] {
  const next = [...items];

  if (mode === "amountDesc") {
    next.sort((left, right) => right.amount - left.amount || left.number.localeCompare(right.number));
    return next;
  }

  next.sort((left, right) => Number(left.number) - Number(right.number));
  return next;
}

export function sortZodiacBars(items: ZodiacBarItem[], mode: "natural" | "amountDesc"): ZodiacBarItem[] {
  const order = new Map(ZODIAC_SEQUENCE.map((zodiac, index) => [zodiac, index]));
  const next = [...items];

  if (mode === "amountDesc") {
    next.sort((left, right) => right.amount - left.amount || (order.get(left.zodiac) ?? 0) - (order.get(right.zodiac) ?? 0));
    return next;
  }

  next.sort((left, right) => (order.get(left.zodiac) ?? 0) - (order.get(right.zodiac) ?? 0));
  return next;
}
