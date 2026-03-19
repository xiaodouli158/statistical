import { NUMBER_ORDER_NATURAL } from "@statisticalsystem/shared";
import type { NormalizedDrawResult, NumberBarItem, SettledOrder } from "../types";
import { getZodiacForNumber } from "../utils/zodiac";

export function buildNumberBars(orders: SettledOrder[], drawResult: NormalizedDrawResult | null, referenceDate?: string | null): NumberBarItem[] {
  const amountMap = new Map<string, number>();
  const zodiacAnchor = drawResult?.openTime ?? referenceDate ?? `${new Date().getUTCFullYear()}-01-01`;

  for (const order of orders) {
    if (order.playType !== "特码直投" || order.values.length === 0 || order.unitPrice <= 0) {
      continue;
    }

    for (const value of order.values) {
      amountMap.set(value, (amountMap.get(value) ?? 0) + order.unitPrice);
    }
  }

  return NUMBER_ORDER_NATURAL.map((number, index) => ({
    number,
    amount: amountMap.get(number) ?? 0,
    isDrawn: drawResult ? drawResult.specialNumber === number : false,
    wave: drawResult && drawResult.specialNumber === number ? drawResult.specialWave : null,
    zodiac: getZodiacForNumber(number, zodiacAnchor)
  }));
}
