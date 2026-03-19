import type { SummaryMetrics } from "@statisticalsystem/parser";
import { MetricCard } from "../../../components/MetricCard";
import { formatCurrency, formatProfit } from "../../../utils/format";

export function SummaryCards({ summary }: { summary: SummaryMetrics }) {
  return (
    <section className="metric-grid">
      <MetricCard label="订单数量" value={String(summary.orderCount)} />
      <MetricCard label="中奖订单数" value={String(summary.winOrderCount)} tone="success" />
      <MetricCard label="未中奖订单数" value={String(summary.loseOrderCount)} />
      <MetricCard label="中奖金额" value={formatCurrency(summary.winAmount)} tone="warning" />
      <MetricCard label="盈利" value={formatProfit(summary.profit)} tone={summary.profit !== null && summary.profit > 0 ? "success" : "default"} />
    </section>
  );
}
