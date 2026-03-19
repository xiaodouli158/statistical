import { NUMBER_ORDER_NATURAL } from "@statisticalsystem/shared";
import type { NormalizedDrawResult, NumberBarItem, SettledOrder } from "../types";
import { getZodiacForNumber } from "../utils/zodiac";

export function buildNumberBars(orders: SettledOrder[], drawResult: NormalizedDrawResult | null): NumberBarItem[] {
  const amountMap = new Map<string, number>();

  for (const order of orders) {
    if (order.values.length === 0 || order.unitPrice <= 0) {
      continue;
    }

    for (const value of order.values) {
      amountMap.set(value, (amountMap.get(value) ?? 0) + order.unitPrice);
    }
  }

  return NUMBER_ORDER_NATURAL.map((number, index) => ({
    number,
    amount: amountMap.get(number) ?? 0,
    isDrawn: drawResult ? drawResult.numbers.includes(number) : false,
    wave: drawResult && drawResult.numbers.includes(number) ? drawResult.waves[drawResult.numbers.indexOf(number)] ?? null : null,
    zodiac: getZodiacForNumber(number, drawResult?.openTime ?? `${new Date().getUTCFullYear()}-01-01`)
  }));
}
