const HTML_ENTITY_MAP: Record<string, string> = {
  "&nbsp;": " ",
  "&#160;": " ",
  "&quot;": "\"",
  "&#34;": "\"",
  "&apos;": "'",
  "&#39;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&"
};

const CHAT_HEADER_PATTERN = /^(?=.{0,200}$).*?(?:聊天记录如下|的聊天记录如下|的聊天记录)[:：]?$/u;
const CHAT_HEADER_PREFIX_PATTERN = /^.*?(?:聊天记录如下|的聊天记录如下|的聊天记录)[:：\s-]*/u;
const EXPECT_ONLY_PATTERN = /^第?\s*20\d{5}\s*期?[:：]?$/u;
const DATE_ONLY_PATTERN = /^\d{4}-\d{1,2}-\d{1,2}$/u;
const DATE_TIME_ONLY_PATTERN = /^\d{4}-\d{1,2}-\d{1,2}\s+\d{2}:\d{2}(?::\d{2})?$/u;
const SENDER_TIME_PATTERN = /^[^:：]{1,40}\s+\d{2}:\d{2}(?::\d{2})?$/u;
const SENDER_DATE_TIME_PATTERN = /^[^:：]{1,40}\s+\d{4}-\d{1,2}-\d{1,2}\s+\d{2}:\d{2}(?::\d{2})?$/u;
const DECORATIVE_SEPARATOR_CHARS = /[\s\-—_=~·•\u2500-\u257f]/gu;
const DECORATIVE_SEPARATOR_ONLY_PATTERN = /^[\s\-—_=~·•\u2500-\u257f]{3,}$/u;
const DECORATIVE_DATE_PREFIX_PATTERN =
  /^[\s\-—_=~·•\u2500-\u257f]*\d{4}-\d{1,2}-\d{1,2}[\s\-—_=~·•\u2500-\u257f]*(?:[:：\s-]+|$)/u;
const DECORATIVE_DATE_SUFFIX_PATTERN =
  /[\s\-—_=~·•\u2500-\u257f]*\d{4}-\d{1,2}-\d{1,2}[\s\-—_=~·•\u2500-\u257f]*$/u;

const PURE_METADATA_PATTERNS = [
  /^Dear[:：]?$/i,
  CHAT_HEADER_PATTERN,
  EXPECT_ONLY_PATTERN,
  /^20\d{5}$/u,
  DATE_ONLY_PATTERN,
  DATE_TIME_ONLY_PATTERN,
  SENDER_TIME_PATTERN,
  SENDER_DATE_TIME_PATTERN
];

const LEADING_METADATA_PATTERNS = [
  CHAT_HEADER_PREFIX_PATTERN,
  /^Dear[:：\s-]*/i,
  /^[^:：]{1,40}\s+\d{4}-\d{1,2}-\d{1,2}\s+\d{2}:\d{2}(?::\d{2})?(?:[:：\s-]+|$)/u,
  /^[^:：]{1,40}\s+\d{2}:\d{2}(?::\d{2})?(?:[:：\s-]+|$)/u,
  DECORATIVE_DATE_PREFIX_PATTERN,
  /^\d{4}-\d{1,2}-\d{1,2}(?:\s+\d{2}:\d{2}(?::\d{2})?)?(?:[:：\s-]+|$)/u,
  /^第?\s*20\d{5}\s*期?[:：\s-]*/u,
  /^20\d{5}[:：\s-]*/u
];

const TRAILING_METADATA_PATTERNS = [
  /\s+第?\s*20\d{5}\s*期?[:：]?$/u,
  /\s+20\d{5}$/u,
  /\s+\d{4}-\d{1,2}-\d{1,2}(?:\s+\d{2}:\d{2}(?::\d{2})?)?$/u,
  DECORATIVE_DATE_SUFFIX_PATTERN
];

function decodeHtmlEntities(input: string): string {
  let value = input;

  for (const [entity, decoded] of Object.entries(HTML_ENTITY_MAP)) {
    value = value.replaceAll(entity, decoded);
  }

  return value;
}

function normalizeLine(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function isNoiseLine(line: string): boolean {
  const value = normalizeLine(line);

  if (!value) {
    return false;
  }

  return (
    PURE_METADATA_PATTERNS.some((pattern) => pattern.test(value)) ||
    DECORATIVE_SEPARATOR_ONLY_PATTERN.test(value) ||
    DATE_ONLY_PATTERN.test(value.replace(DECORATIVE_SEPARATOR_CHARS, ""))
  );
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
  const lines = decodeHtmlEntities(body).replace(/\u00A0/g, " ").replace(/\r\n/g, "\n").split("\n");
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
