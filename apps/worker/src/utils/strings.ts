export function toCamelCaseRecord<T extends Record<string, unknown>>(record: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase()), value])
  );
}
