export function normalizeChunk(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, "\"")
    .replace(/[，、]/g, ",")
    .replace(/[；;]/g, ";")
    .replace(/[：:]/g, ":")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[。]/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeNumberToken(input: string): string {
  return String(Number(input)).padStart(2, "0");
}
