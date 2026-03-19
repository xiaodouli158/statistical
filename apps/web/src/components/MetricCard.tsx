type MetricCardProps = {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
  valueTone?: "default" | "success" | "warning" | "danger" | "muted";
};

export function MetricCard({ label, value, tone = "default", valueTone = "default" }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <span className="metric-card__label">{label}</span>
      <strong className={`metric-card__value metric-card__value--${valueTone}`}>{value}</strong>
    </article>
  );
}
