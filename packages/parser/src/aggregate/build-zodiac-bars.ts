import { ZODIAC_SEQUENCE } from "@statisticalsystem/shared";
import type { NormalizedDrawResult, SettledOrder, ZodiacBarItem } from "../types";
import { getZodiacForNumber } from "../utils/zodiac";

export function buildZodiacBars(orders: SettledOrder[], drawResult: NormalizedDrawResult | null): ZodiacBarItem[] {
  const amountMap = new Map<string, number>();

  for (const order of orders) {
    if (order.type === "zodiac") {
      for (const zodiac of order.zodiacs) {
        amountMap.set(zodiac, (amountMap.get(zodiac) ?? 0) + order.unitPrice);
      }
      continue;
    }

    for (const value of order.values) {
      const zodiac = getZodiacForNumber(value, drawResult?.openTime ?? `${new Date().getUTCFullYear()}-01-01`);
      amountMap.set(zodiac, (amountMap.get(zodiac) ?? 0) + order.unitPrice);
    }
  }

  const drawnZodiacs = new Set(drawResult?.zodiacs ?? []);

  return ZODIAC_SEQUENCE.map((zodiac) => ({
    zodiac,
    amount: amountMap.get(zodiac) ?? 0,
    isDrawn: drawnZodiacs.has(zodiac)
  }));
}
