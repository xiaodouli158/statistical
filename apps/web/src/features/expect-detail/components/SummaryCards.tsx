import type { SummaryMetrics } from "@statisticalsystem/parser";
import { MetricCard } from "../../../components/MetricCard";
import { formatCurrency, formatProfit } from "../../../utils/format";

function formatMetricCount(value: number | null): string {
  return value === null ? "---" : String(value);
}

function formatMetricAmount(value: number | null): string {
  return value === null ? "---" : formatCurrency(value);
}

function getProfitTone(value: number | null): "default" | "success" | "warning" {
  if (value === null) {
    return "default";
  }

  return value > 0 ? "success" : value < 0 ? "warning" : "default";
}

function getProfitValueTone(value: number | null): "default" | "success" | "danger" | "muted" {
  if (value === null) {
    return "muted";
  }

  return value > 0 ? "success" : value < 0 ? "danger" : "default";
}

export function SummaryCards({ summary }: { summary: SummaryMetrics }) {
  return (
    <section className="metric-grid">
      <MetricCard label="订单数量" value={String(summary.orderCount)} />
      <MetricCard label="订单总额" value={formatCurrency(summary.totalAmount)} />
      <MetricCard
        label="中奖订单数"
        value={formatMetricCount(summary.winOrderCount)}
        tone="success"
        valueTone={summary.winOrderCount === null ? "muted" : "warning"}
      />
      <MetricCard label="未中奖订单数" value={formatMetricCount(summary.loseOrderCount)} valueTone={summary.loseOrderCount === null ? "muted" : "success"} />
      <MetricCard label="中奖金额" value={formatMetricAmount(summary.winAmount)} tone="warning" valueTone={summary.winAmount === null ? "muted" : "danger"} />
      <MetricCard
        label="庄家盈亏"
        value={formatProfit(summary.houseProfitLoss)}
        tone={getProfitTone(summary.houseProfitLoss)}
        valueTone={getProfitValueTone(summary.houseProfitLoss)}
      />
      <MetricCard label="水点3%" value={formatCurrency(summary.rebateAmount)} tone="warning" valueTone="warning" />
      <MetricCard
        label="最终盈亏"
        value={formatProfit(summary.finalProfitLoss)}
        tone={getProfitTone(summary.finalProfitLoss)}
        valueTone={getProfitValueTone(summary.finalProfitLoss)}
      />
    </section>
  );
}
