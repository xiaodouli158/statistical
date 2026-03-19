import { DEFAULT_NUMBER_ODDS, DEFAULT_ZODIAC_ODDS, type ZodiacName } from "@statisticalsystem/shared";
import type { NormalizedDrawResult, ParsedOrder, SettledOrder } from "../types";

function uniqueZodiacs(input: ZodiacName[]): ZodiacName[] {
  return Array.from(new Set(input));
}

export function settleOrders(orders: ParsedOrder[], drawResult: NormalizedDrawResult | null): SettledOrder[] {
  if (!drawResult) {
    return orders.map((order) => ({
      ...order,
      hitStatus: order.status === "review" ? "review" : "pending",
      hitNumbers: [],
      hitZodiacs: [],
      payout: 0,
      resultText: order.status === "review" ? "规则待确认" : "待开奖"
    }));
  }

  const drawNumberSet = new Set(drawResult.numbers);
  const drawZodiacSet = new Set(uniqueZodiacs(drawResult.zodiacs));

  return orders.map<SettledOrder>((order) => {
    if (order.status === "review") {
      return {
        ...order,
        hitStatus: "review",
        hitNumbers: [],
        hitZodiacs: [],
        payout: 0,
        resultText: "规则待确认"
      };
    }

    if (order.type === "number") {
      const hitNumbers = order.values.filter((value) => drawNumberSet.has(value));
      const hitCount = hitNumbers.length;
      const payout = hitCount * order.unitPrice * DEFAULT_NUMBER_ODDS;

      return {
        ...order,
        hitStatus: hitCount === 0 ? "lose" : hitCount === order.values.length ? "win" : "partial",
        hitNumbers,
        hitZodiacs: [],
        payout,
        resultText: hitCount === 0 ? "未中奖" : `命中 ${hitNumbers.join(",")}，派彩 ${payout}`
      };
    }

    if (order.type === "zodiac") {
      const hitZodiacs = order.zodiacs.filter((value) => drawZodiacSet.has(value));
      const hitCount = hitZodiacs.length;
      const payout = hitCount * order.unitPrice * DEFAULT_ZODIAC_ODDS;

      return {
        ...order,
        hitStatus: hitCount === 0 ? "lose" : hitCount === order.zodiacs.length ? "win" : "partial",
        hitNumbers: [],
        hitZodiacs,
        payout,
        resultText: hitCount === 0 ? "未中奖" : `命中 ${hitZodiacs.join(",")}，派彩 ${payout}`
      };
    }

    return {
      ...order,
      hitStatus: "review",
      hitNumbers: [],
      hitZodiacs: [],
      payout: 0,
      resultText: "规则待确认"
    };
  });
}
