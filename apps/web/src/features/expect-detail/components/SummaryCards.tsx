import type { SummaryMetrics } from "@statisticalsystem/parser";
import { MetricCard } from "../../../components/MetricCard";
import { formatCurrency, formatProfit } from "../../../utils/format";

function formatMetricCount(value: number | null): string {
  return value === null ? "---" : String(value);
}

function formatMetricAmount(value: number | null): string {
  return value === null ? "---" : formatCurrency(value);
}

export function SummaryCards({ summary }: { summary: SummaryMetrics }) {
  return (
    <section className="metric-grid">
      <MetricCard label="订单数量" value={String(summary.orderCount)} />
      <MetricCard label="订单总额" value={formatCurrency(summary.totalAmount)} />
      <MetricCard label="中奖订单数" value={formatMetricCount(summary.winOrderCount)} tone="success" valueTone={summary.winOrderCount === null ? "muted" : "warning"} />
      <MetricCard label="未中奖订单数" value={formatMetricCount(summary.loseOrderCount)} valueTone={summary.loseOrderCount === null ? "muted" : "success"} />
      <MetricCard label="中奖金额" value={formatMetricAmount(summary.winAmount)} tone="warning" valueTone={summary.winAmount === null ? "muted" : "danger"} />
      <MetricCard
        label="庄家盈利"
        value={formatProfit(summary.profit)}
        tone={summary.profit !== null && summary.profit > 0 ? "success" : summary.profit !== null && summary.profit < 0 ? "warning" : "default"}
        valueTone={summary.profit === null ? "muted" : summary.profit > 0 ? "success" : summary.profit < 0 ? "danger" : "default"}
      />
    </section>
  );
}
