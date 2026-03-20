export function toCamelCaseRecord<T extends Record<string, unknown>>(record: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase()), value])
  );
}

export function normalizeEmailAddress(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return null;
  }

  const matched = trimmed.match(/<([^<>]+)>/);
  const normalized = (matched?.[1] ?? trimmed).trim().toLowerCase();

  if (!normalized || !/^[^@\s]+@[^@\s]+$/.test(normalized)) {
    return null;
  }

  return normalized;
}
