import type { SettledOrder, SummaryMetrics } from "../types";

export function buildSummaryMetrics(orders: SettledOrder[]): SummaryMetrics {
  const orderCount = orders.length;
  const winOrderCount = orders.filter((order) => order.hitStatus === "win" || order.hitStatus === "partial").length;
  const loseOrderCount = orders.filter((order) => order.hitStatus === "lose").length;
  const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0);
  const winAmount = orders.reduce((sum, order) => sum + order.payout, 0);
  const hasPending = orders.some((order) => order.hitStatus === "pending");

  return {
    orderCount,
    winOrderCount,
    loseOrderCount,
    winAmount,
    totalAmount,
    profit: hasPending ? null : winAmount - totalAmount
  };
}
