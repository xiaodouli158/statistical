type MetricCardProps = {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
};

export function MetricCard({ label, value, tone = "default" }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <span className="metric-card__label">{label}</span>
      <strong className="metric-card__value">{value}</strong>
    </article>
  );
}
