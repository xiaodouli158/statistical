import type { SettledOrder, SummaryMetrics } from "../types";

export function buildSummaryMetrics(orders: SettledOrder[]): SummaryMetrics {
  const orderCount = orders.length;
  const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0);
  const hasPending = orders.some((order) => order.hitStatus === "pending");

  if (hasPending) {
    return {
      orderCount,
      winOrderCount: null,
      loseOrderCount: null,
      winAmount: null,
      totalAmount,
      profit: null
    };
  }

  const winOrderCount = orders.filter((order) => order.hitStatus === "win" || order.hitStatus === "partial").length;
  const loseOrderCount = orders.filter((order) => order.hitStatus === "lose").length;
  const winAmount = orders.reduce((sum, order) => sum + order.payout, 0);

  return {
    orderCount,
    winOrderCount,
    loseOrderCount,
    winAmount,
    totalAmount,
    profit: totalAmount - winAmount
  };
}
