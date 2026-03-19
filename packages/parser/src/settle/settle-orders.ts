import type { ZodiacName } from "@statisticalsystem/shared";
import type { NormalizedDrawResult, ParsedOrder, SettledOrder } from "../types";

function uniqueZodiacs(input: ZodiacName[]): ZodiacName[] {
  return Array.from(new Set(input));
}

function uniqueValues(input: string[]): string[] {
  return Array.from(new Set(input));
}

export function settleOrders(orders: ParsedOrder[], drawResult: NormalizedDrawResult | null): SettledOrder[] {
  if (!drawResult) {
    return orders.map((order) => ({
      ...order,
      hitStatus: "pending",
      hitValues: [],
      hitNumbers: [],
      hitZodiacs: [],
      hitTails: [],
      payout: 0,
      houseProfit: null
    }));
  }

  const specialNumberSet = new Set(drawResult.specialNumber ? [drawResult.specialNumber] : []);
  const drawZodiacSet = new Set(uniqueZodiacs(drawResult.zodiacs));
  const drawTailSet = new Set(uniqueValues(drawResult.numbers.map((value) => String(Number(value) % 10))));

  return orders.map<SettledOrder>((order) => {
    let hitValues: string[] = [];
    let hitNumbers: string[] = [];
    let hitZodiacs: ZodiacName[] = [];
    let hitTails: string[] = [];

    switch (order.playType) {
      case "平特":
        hitZodiacs = order.zodiacs.filter((value) => drawZodiacSet.has(value));
        hitValues = [...hitZodiacs];
        break;
      case "平特尾数":
        hitTails = order.tails.filter((value) => drawTailSet.has(value));
        hitValues = hitTails.map((value) => `${value}尾`);
        break;
      case "特码直投":
      default:
        hitNumbers = order.values.filter((value) => specialNumberSet.has(value));
        hitZodiacs = order.zodiacs.filter((value) => drawResult.specialZodiac === value);
        hitValues = [...hitNumbers];
        break;
    }

    const hitCount = hitValues.length;
    const payout = hitCount * order.unitPrice * order.odds;

    return {
      ...order,
      hitStatus: hitCount === 0 ? "lose" : hitCount === order.values.length ? "win" : "partial",
      hitValues,
      hitNumbers,
      hitZodiacs,
      hitTails,
      payout,
      houseProfit: order.amount - payout
    };
  });
}
