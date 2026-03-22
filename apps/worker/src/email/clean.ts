const PURE_METADATA_PATTERNS = [
  /^Dear[:：]?$/i,
  /^(?:微信群聊记录如下|微信群聊天记录如下|微信聊天记录如下|群聊记录如下|聊天记录如下)[:：]?$/,
  /^第?\s*20\d{5}\s*期?[:：]?$/,
  /^20\d{5}$/,
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/,
  /^[^:：]{1,40}\s+\d{2}:\d{2}(:\d{2})?$/,
  /^[^:：]{1,40}\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/,
  /^-{3,}$/,
  /^={3,}$/
];

const LEADING_METADATA_PATTERNS = [
  /^(?:微信群聊记录如下|微信群聊天记录如下|微信聊天记录如下|群聊记录如下|聊天记录如下)[:：\s-]*/,
  /^Dear[:：\s-]*/i,
  /^[^:：]{1,40}\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?(?:[:：\s-]+|$)/,
  /^[^:：]{1,40}\s+\d{2}:\d{2}(?::\d{2})?(?:[:：\s-]+|$)/,
  /^\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}(?::\d{2})?)?(?:[:：\s-]+|$)/,
  /^第?\s*20\d{5}\s*期?[:：\s-]*/,
  /^20\d{5}[:：\s-]*/
];

const TRAILING_METADATA_PATTERNS = [
  /\s+第?\s*20\d{5}\s*期?[:：]?$/,
  /\s+20\d{5}$/,
  /\s+\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}(?::\d{2})?)?$/
];

function normalizeLine(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function isNoiseLine(line: string): boolean {
  const value = normalizeLine(line);

  if (!value) {
    return false;
  }

  return PURE_METADATA_PATTERNS.some((pattern) => pattern.test(value));
}

function stripMetadataFragments(line: string): string {
  let value = normalizeLine(line);

  if (!value) {
    return value;
  }

  let updated = true;

  while (updated && value) {
    updated = false;

    for (const pattern of LEADING_METADATA_PATTERNS) {
      const match = value.match(pattern)?.[0];

      if (!match || match.length >= value.length) {
        continue;
      }

      value = normalizeLine(value.slice(match.length));
      updated = true;
    }

    for (const pattern of TRAILING_METADATA_PATTERNS) {
      if (!pattern.test(value)) {
        continue;
      }

      value = normalizeLine(value.replace(pattern, ""));
      updated = true;
    }
  }

  return value;
}

export function cleanMailBody(body: string): string[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const chunks: string[] = [];
  let buffer: string[] = [];

  for (const rawLine of lines) {
    const trimmed = normalizeLine(rawLine);

    if (!trimmed) {
      if (buffer.length > 0) {
        chunks.push(buffer.join(" ").trim());
        buffer = [];
      }

      continue;
    }

    if (isNoiseLine(trimmed)) {
      continue;
    }

    const sanitized = stripMetadataFragments(trimmed);

    if (!sanitized || isNoiseLine(sanitized)) {
      continue;
    }

    buffer.push(sanitized);
  }

  if (buffer.length > 0) {
    chunks.push(buffer.join(" ").trim());
  }

  return chunks.filter(Boolean);
}
