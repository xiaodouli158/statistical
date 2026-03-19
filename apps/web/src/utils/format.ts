export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }

  return `¥${value.toFixed(2)}`;
}

export function formatSignedCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "---";
  }

  if (value === 0) {
    return "¥0.00";
  }

  const sign = value > 0 ? "+" : "-";
  return `${sign}¥${Math.abs(value).toFixed(2)}`;
}

export function formatProfit(value: number | null): string {
  if (value === null) {
    return "---";
  }

  return formatSignedCurrency(value);
}
