const METADATA_PATTERNS = [
  /^Dear[:：]?$/i,
  /^微信群.*聊天记录如下$/,
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/,
  /^[^:]{1,40}\s+\d{2}:\d{2}(:\d{2})?$/,
  /^[^:]{1,40}\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/,
  /^-{3,}$/,
  /^={3,}$/
];

function isNoiseLine(line: string): boolean {
  const value = line.trim();

  if (!value) {
    return false;
  }

  return METADATA_PATTERNS.some((pattern) => pattern.test(value));
}

export function cleanMailBody(body: string): string[] {
  const lines = body
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !isNoiseLine(line));

  const chunks: string[] = [];
  let buffer: string[] = [];

  for (const line of lines) {
    if (!line) {
      if (buffer.length > 0) {
        chunks.push(buffer.join(" ").trim());
        buffer = [];
      }
      continue;
    }

    buffer.push(line);
  }

  if (buffer.length > 0) {
    chunks.push(buffer.join(" ").trim());
  }

  return chunks.filter(Boolean);
}
