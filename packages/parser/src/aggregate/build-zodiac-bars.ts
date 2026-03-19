import { ZODIAC_SEQUENCE } from "@statisticalsystem/shared";
import type { NormalizedDrawResult, SettledOrder, ZodiacBarItem } from "../types";
import { getZodiacForNumber } from "../utils/zodiac";

export function buildZodiacBars(orders: SettledOrder[], drawResult: NormalizedDrawResult | null, referenceDate?: string | null): ZodiacBarItem[] {
  const amountMap = new Map<string, number>();
  const zodiacAnchor = drawResult?.openTime ?? referenceDate ?? `${new Date().getUTCFullYear()}-01-01`;

  for (const order of orders) {
    if (order.playType !== "特码直投") {
      continue;
    }

    for (const value of order.values) {
      const zodiac = getZodiacForNumber(value, zodiacAnchor);
      amountMap.set(zodiac, (amountMap.get(zodiac) ?? 0) + order.unitPrice);
    }
  }

  const drawnZodiacs = new Set(drawResult?.specialZodiac ? [drawResult.specialZodiac] : []);

  return ZODIAC_SEQUENCE.map((zodiac) => ({
    zodiac,
    amount: amountMap.get(zodiac) ?? 0,
    isDrawn: drawnZodiacs.has(zodiac)
  }));
}
