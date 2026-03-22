import type { SettledOrder, SummaryMetrics } from "../types";

const WATER_POINT_RATE = 0.03;

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function buildSummaryMetrics(orders: SettledOrder[]): SummaryMetrics {
  const orderCount = orders.length;
  const totalAmount = roundCurrency(orders.reduce((sum, order) => sum + order.amount, 0));
  const rebateAmount = roundCurrency(totalAmount * WATER_POINT_RATE);
  const hasPending = orders.some((order) => order.hitStatus === "pending");

  if (hasPending) {
    return {
      orderCount,
      winOrderCount: null,
      loseOrderCount: null,
      winAmount: null,
      totalAmount,
      houseProfitLoss: null,
      rebateAmount,
      finalProfitLoss: null
    };
  }

  const winOrderCount = orders.filter((order) => order.hitStatus === "win" || order.hitStatus === "partial").length;
  const loseOrderCount = orders.filter((order) => order.hitStatus === "lose").length;
  const winAmount = roundCurrency(orders.reduce((sum, order) => sum + order.payout, 0));
  const houseProfitLoss = roundCurrency(totalAmount - winAmount);

  return {
    orderCount,
    winOrderCount,
    loseOrderCount,
    winAmount,
    totalAmount,
    houseProfitLoss,
    rebateAmount,
    finalProfitLoss: roundCurrency(houseProfitLoss - rebateAmount)
  };
}
