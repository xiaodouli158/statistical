import { DEFAULT_NUMBER_ODDS, type ZodiacName } from "@statisticalsystem/shared";
import type { NormalizedDrawResult, ParsedOrder, SettledOrder } from "../types";

function uniqueZodiacs(input: ZodiacName[]): ZodiacName[] {
  return Array.from(new Set(input));
}

export function settleOrders(orders: ParsedOrder[], drawResult: NormalizedDrawResult | null): SettledOrder[] {
  if (!drawResult) {
    return orders.map((order) => ({
      ...order,
      hitStatus: "pending",
      hitNumbers: [],
      hitZodiacs: [],
      payout: 0,
      houseProfit: null
    }));
  }

  const specialNumberSet = new Set(drawResult.specialNumber ? [drawResult.specialNumber] : []);
  const specialZodiacSet = new Set(drawResult.specialZodiac ? uniqueZodiacs([drawResult.specialZodiac]) : []);

  return orders.map<SettledOrder>((order) => {
    const hitNumbers = order.values.filter((value) => specialNumberSet.has(value));
    const hitCount = hitNumbers.length;
    const payout = hitCount * order.unitPrice * DEFAULT_NUMBER_ODDS;

    return {
      ...order,
      hitStatus: hitCount === 0 ? "lose" : hitCount === order.values.length ? "win" : "partial",
      hitNumbers,
      hitZodiacs: order.zodiacs.filter((value) => specialZodiacSet.has(value)),
      payout,
      houseProfit: order.amount - payout
    };
  });
}
