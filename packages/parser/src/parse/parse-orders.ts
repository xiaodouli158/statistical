import type { ZodiacName } from "@statisticalsystem/shared";
import { getOddsForPlayType, resolveOddsConfig } from "../config/odds";
import type { Marker, OddsConfigInput, OrderException, ParsedOrder, ParseOrdersResult, PlayType } from "../types";
import { MARKERS } from "../constants/markers";
import { parseChineseNumber } from "../utils/chinese-number";
import { normalizeChunk } from "../utils/text";
import { resolveTemaSubject } from "../utils/tema-filters";
import { extractZodiacs, getNumbersForZodiac } from "../utils/zodiac";

const PRICE_UNIT_PATTERN = /(米|元|块|塊|斤|闷)$/;
const SEPARATOR_PATTERN = /[\s,，、。.;；]+/;
const CHINESE_NUMBER_PATTERN = /[零一二两三四五六七八九十百千]/;
const SLASH_MARKER_PATTERN = /\/+/g;
const ZODIAC_TEMA_MARKERS = new Set<Marker>(["各数", "各号"]);
const IGNORED_CHUNK_PATTERNS = [
  /^Dear:?$/i,
  /^微信群.*聊天记录如下:?$/,
  /^\d{4}-\d{1,2}-\d{1,2}$/,
  /^\d{4}-\d{1,2}-\d{1,2}\s+\d{2}:\d{2}(:\d{2})?$/,
  /^[^:]{1,40}\s+\d{2}:\d{2}(:\d{2})?$/,
  /^[^:]{1,40}\s+\d{4}-\d{1,2}-\d{1,2}\s+\d{2}:\d{2}(:\d{2})?$/,
  /^[-=—_]{3,}$/,
  /^[-=—_\s]*\d{4}-\d{1,2}-\d{1,2}[-=—_\s]*$/,
  /^[-—]\d{1,4}$/
];
const PLAY_TYPE_PREFIXES: Array<{ prefix: string; playType: PlayType }> = [
  { prefix: "平特尾数", playType: "平特尾数" },
  { prefix: "平特尾", playType: "平特尾数" },
  { prefix: "平特肖", playType: "平特" },
  { prefix: "平特", playType: "平特" }
];

function splitCandidates(chunk: string): string[] {
  const candidates: string[] = [];
  const source = chunk.replace(/\r\n/g, "\n");
  let cursor = 0;

  while (cursor < source.length) {
    cursor = skipSeparators(source, cursor);

    if (cursor >= source.length) {
      break;
    }

    const markerMatch = findMarker(source, cursor);

    if (!markerMatch) {
      const tail = normalizeChunk(source.slice(cursor));

      if (tail) {
        candidates.push(tail);
      }

      break;
    }

    const priceEnd = findPriceEnd(source, markerMatch.index + markerMatch.marker.length);

    if (priceEnd <= markerMatch.index + markerMatch.marker.length) {
      const fallback = normalizeChunk(source.slice(cursor));

      if (fallback) {
        candidates.push(fallback);
      }

      break;
    }

    const candidate = normalizeChunk(source.slice(cursor, priceEnd));

    if (candidate) {
      candidates.push(candidate);
    }

    cursor = priceEnd;
  }

  return candidates.filter(Boolean);
}

function findMarker(input: string, fromIndex = 0): { marker: Marker; index: number } | null {
  let result: { marker: Marker; index: number } | null = null;

  for (const marker of MARKERS) {
    const index = input.indexOf(marker, fromIndex);

    if (index < 0) {
      continue;
    }

    if (!result || index < result.index || (index === result.index && marker.length > result.marker.length)) {
      result = { marker, index };
    }
  }

  SLASH_MARKER_PATTERN.lastIndex = fromIndex;
  const slashMatch = SLASH_MARKER_PATTERN.exec(input);

  if (
    slashMatch &&
    (!result || slashMatch.index < result.index || (slashMatch.index === result.index && slashMatch[0].length > result.marker.length))
  ) {
    result = { marker: slashMatch[0], index: slashMatch.index };
  }

  return result;
}

function skipSeparators(input: string, startIndex: number): number {
  let index = startIndex;

  while (index < input.length && SEPARATOR_PATTERN.test(input[index] ?? "")) {
    index += 1;
  }

  return index;
}

function isPlayTypePrefixAt(input: string, index: number): boolean {
  return PLAY_TYPE_PREFIXES.some(({ prefix }) => input.startsWith(prefix, index));
}

function isPriceUnit(char: string): boolean {
  return PRICE_UNIT_PATTERN.test(char);
}

function findPriceEnd(input: string, startIndex: number): number {
  let index = skipSeparators(input, startIndex);

  if (index >= input.length) {
    return index;
  }

  const start = index;
  const current = input[index] ?? "";

  if (/\d/.test(current)) {
    while (/\d/.test(input[index] ?? "")) {
      index += 1;
    }

    const integerEnd = index;

    if (input[index] === "." && /\d/.test(input[index + 1] ?? "")) {
      let decimalEnd = index + 1;

      while (/\d/.test(input[decimalEnd] ?? "")) {
        decimalEnd += 1;
      }

      const nextChar = input[decimalEnd] ?? "";

      if (!nextChar || /\s/.test(nextChar) || isPriceUnit(nextChar) || isPlayTypePrefixAt(input, decimalEnd)) {
        index = decimalEnd;
      } else {
        index = integerEnd;
      }
    }
  } else if (CHINESE_NUMBER_PATTERN.test(current)) {
    while (CHINESE_NUMBER_PATTERN.test(input[index] ?? "")) {
      index += 1;
    }
  } else {
    return start;
  }

  if (isPriceUnit(input[index] ?? "")) {
    index += 1;
  }

  return index;
}

function extractPrice(raw: string): { priceRaw: string | null; unitPrice: number } {
  const clean = raw.replace(PRICE_UNIT_PATTERN, "");
  const parsed = parseChineseNumber(clean);

  return {
    priceRaw: clean || null,
    unitPrice: parsed ?? 0
  };
}

function buildZodiacSection(zodiacs: ZodiacName[], referenceDate: string | null | undefined): string {
  const mappedNumbers = zodiacs.flatMap((zodiac) => getNumbersForZodiac(zodiac, referenceDate));

  return `${zodiacs.join(",")}(${mappedNumbers.join(", ")})`;
}

function buildZodiacList(zodiacs: ZodiacName[]): string {
  return zodiacs.join(", ");
}

function buildTailContent(tails: string[]): string {
  return tails.map((tail) => `${tail}尾`).join(", ");
}

function buildContent(numbers: string[], zodiacs: ZodiacName[], referenceDate: string | null | undefined): string {
  const segments: string[] = [];

  if (numbers.length > 0) {
    segments.push(numbers.join(", "));
  }

  if (zodiacs.length > 0) {
    segments.push(buildZodiacSection(zodiacs, referenceDate));
  }

  return segments.join(", ");
}

function buildResolvedTemaContent(
  subject: string,
  values: string[],
  directNumbers: string[],
  directZodiacs: ZodiacName[],
  referenceDate: string | null | undefined,
  usesFilterGroups: boolean
): string {
  if (!usesFilterGroups) {
    return buildContent(directNumbers, directZodiacs, referenceDate) || subject;
  }

  return values.length > 0 ? `${subject}（${values.join(",")}）` : subject;
}

function buildException(raw: string, sourceChunk: string, reason: string, index: number): OrderException {
  return {
    id: `exception-${index}`,
    raw,
    sourceChunk,
    reason
  };
}

function extractPlayType(subject: string): { playType: PlayType; subject: string } {
  const trimmed = subject.trim();

  for (const entry of PLAY_TYPE_PREFIXES) {
    if (!trimmed.startsWith(entry.prefix)) {
      continue;
    }

    return {
      playType: entry.playType,
      subject: trimmed.slice(entry.prefix.length).trim().replace(/^[,/:]+/, "").trim()
    };
  }

  return {
    playType: "特码直投",
    subject: trimmed
  };
}

function normalizeTailToken(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(/^0+(?=\d)/, "");

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const value = Number(normalized);

  if (!Number.isInteger(value) || value < 0 || value > 9) {
    return null;
  }

  return String(value);
}

function extractTails(subject: string): string[] {
  const tokens = subject
    .replace(/尾数/g, "")
    .replace(/尾/g, "")
    .split(/[^\d]+/)
    .map((token) => normalizeTailToken(token))
    .filter((token): token is string => Boolean(token));

  return Array.from(new Set(tokens));
}

function buildOrderId(orderNo: number, playType: PlayType, values: string[]): string {
  return `${orderNo}-${playType}-${values.join("-") || "raw"}`;
}

function shouldIgnoreChunk(chunk: string): boolean {
  return IGNORED_CHUNK_PATTERNS.some((pattern) => pattern.test(chunk));
}

const MAX_PENDING_CONTENT_CHUNKS = 4;

function hasRecognizedContentForMerge(subject: string, referenceDate: string | null | undefined): boolean {
  const { subject: normalizedSubject } = extractPlayType(subject);

  if (!normalizedSubject) {
    return false;
  }

  return (
    resolveTemaSubject(normalizedSubject, referenceDate).hasRecognizedContent ||
    extractZodiacs(normalizedSubject).length > 0 ||
    extractTails(normalizedSubject).length > 0
  );
}

function classifyChunkForMerge(chunk: string, referenceDate: string | null | undefined): "ignored" | "content" | "priced" | "other" {
  if (!chunk || shouldIgnoreChunk(chunk)) {
    return "ignored";
  }

  const markerMatch = findMarker(chunk);

  if (!markerMatch) {
    return hasRecognizedContentForMerge(chunk, referenceDate) ? "content" : "other";
  }

  const rawSubject = chunk.slice(0, markerMatch.index).trim().replace(/[,/]+$/, "");
  const priceEnd = findPriceEnd(chunk, markerMatch.index + markerMatch.marker.length);

  if (priceEnd > markerMatch.index + markerMatch.marker.length) {
    return "priced";
  }

  return hasRecognizedContentForMerge(rawSubject, referenceDate) ? "content" : "other";
}

function mergeRelatedChunks(messageChunks: string[], referenceDate: string | null | undefined): string[] {
  const merged: string[] = [];
  let pendingContent: string[] = [];

  function flushPendingContent(): void {
    if (pendingContent.length > 0) {
      merged.push(...pendingContent);
      pendingContent = [];
    }
  }

  for (const rawChunk of messageChunks) {
    const chunk = normalizeChunk(rawChunk);
    const kind = classifyChunkForMerge(chunk, referenceDate);

    if (kind === "ignored") {
      flushPendingContent();
      continue;
    }

    if (kind === "content") {
      if (pendingContent.length >= MAX_PENDING_CONTENT_CHUNKS) {
        merged.push(pendingContent.shift() ?? chunk);
      }

      pendingContent.push(chunk);
      continue;
    }

    if (kind === "priced") {
      if (pendingContent.length > 0) {
        merged.push([...pendingContent, chunk].join(" "));
        pendingContent = [];
      } else {
        merged.push(chunk);
      }

      continue;
    }

    flushPendingContent();
    merged.push(chunk);
  }

  flushPendingContent();
  return merged;
}

function isSlashMarker(marker: Marker): boolean {
  return /^\/+$/.test(marker);
}

function isTemaZodiacMarker(marker: Marker): boolean {
  return ZODIAC_TEMA_MARKERS.has(marker);
}

function parseTemaDirectOrder(
  candidate: string,
  sourceChunk: string,
  orderNo: number,
  rawSubject: string,
  subject: string,
  marker: Marker,
  pricePart: string,
  referenceDate: string | null | undefined,
  oddsConfig: OddsConfigInput | undefined
): ParsedOrder | OrderException {
  const resolvedSubject = resolveTemaSubject(subject, referenceDate);
  const numbers = resolvedSubject.directNumbers;
  const zodiacs = resolvedSubject.directZodiacs;
  const values = resolvedSubject.values;
  const { priceRaw, unitPrice } = extractPrice(pricePart);

  if (!resolvedSubject.hasRecognizedContent) {
    return buildException(candidate, sourceChunk, "未识别到号码、生肖或组合条件", orderNo);
  }

  if (values.length === 0) {
    return buildException(candidate, sourceChunk, "组合条件未匹配到号码", orderNo);
  }

  if (zodiacs.length > 0 && !isTemaZodiacMarker(marker)) {
    return buildException(candidate, sourceChunk, "特码直投生肖下注需使用各数或各号", orderNo);
  }

  if (zodiacs.length === 0 && marker !== "各数" && marker !== "各" && marker !== "各个" && marker !== "各号" && !isSlashMarker(marker)) {
    return buildException(candidate, sourceChunk, "未识别到下注金额标记", orderNo);
  }

  if (unitPrice <= 0) {
    return buildException(candidate, sourceChunk, "未识别到有效金额", orderNo);
  }

  const resolvedOdds = resolveOddsConfig(oddsConfig);
  const content =
    buildResolvedTemaContent(subject, values, numbers, zodiacs, referenceDate, resolvedSubject.usesFilterGroups) || subject || candidate;
  const betCount = values.length;

  return {
    id: buildOrderId(orderNo, "特码直投", values),
    orderNo,
    raw: candidate,
    sourceContent: rawSubject || candidate,
    content,
    marker,
    priceRaw,
    betCount,
    unitPrice,
    amount: betCount * unitPrice,
    odds: getOddsForPlayType("特码直投", resolvedOdds),
    values,
    zodiacs,
    tails: [],
    playType: "特码直投",
    type: "number",
    status: "ok"
  };
}

function parsePingteOrder(
  candidate: string,
  sourceChunk: string,
  orderNo: number,
  rawSubject: string,
  subject: string,
  marker: Marker,
  pricePart: string,
  oddsConfig: OddsConfigInput | undefined
): ParsedOrder | OrderException {
  const zodiacs = extractZodiacs(subject);
  const { priceRaw, unitPrice } = extractPrice(pricePart);

  if (zodiacs.length === 0) {
    return buildException(candidate, sourceChunk, "未识别到平码生肖", orderNo);
  }

  if (unitPrice <= 0) {
    return buildException(candidate, sourceChunk, "未识别到有效金额", orderNo);
  }

  const resolvedOdds = resolveOddsConfig(oddsConfig);
  const values = [...zodiacs];

  return {
    id: buildOrderId(orderNo, "平特", values),
    orderNo,
    raw: candidate,
    sourceContent: rawSubject || candidate,
    content: buildZodiacList(zodiacs),
    marker,
    priceRaw,
    betCount: zodiacs.length,
    unitPrice,
    amount: zodiacs.length * unitPrice,
    odds: getOddsForPlayType("平特", resolvedOdds),
    values,
    zodiacs,
    tails: [],
    playType: "平特",
    type: "zodiac",
    status: "ok"
  };
}

function parsePingteTailOrder(
  candidate: string,
  sourceChunk: string,
  orderNo: number,
  rawSubject: string,
  subject: string,
  marker: Marker,
  pricePart: string,
  oddsConfig: OddsConfigInput | undefined
): ParsedOrder | OrderException {
  const tails = extractTails(subject);
  const { priceRaw, unitPrice } = extractPrice(pricePart);

  if (tails.length === 0) {
    return buildException(candidate, sourceChunk, "未识别到平特尾数", orderNo);
  }

  if (unitPrice <= 0) {
    return buildException(candidate, sourceChunk, "未识别到有效金额", orderNo);
  }

  const resolvedOdds = resolveOddsConfig(oddsConfig);
  const values = tails.map((tail) => `${tail}尾`);

  return {
    id: buildOrderId(orderNo, "平特尾数", values),
    orderNo,
    raw: candidate,
    sourceContent: rawSubject || candidate,
    content: buildTailContent(tails),
    marker,
    priceRaw,
    betCount: tails.length,
    unitPrice,
    amount: tails.length * unitPrice,
    odds: getOddsForPlayType("平特尾数", resolvedOdds),
    values,
    zodiacs: [],
    tails,
    playType: "平特尾数",
    type: "tail",
    status: "ok"
  };
}

function parseCandidate(
  candidate: string,
  sourceChunk: string,
  orderNo: number,
  referenceDate: string | null | undefined,
  oddsConfig: OddsConfigInput | undefined
): ParsedOrder | OrderException {
  const markerMatch = findMarker(candidate);

  if (!markerMatch) {
    return buildException(candidate, sourceChunk, "未识别到下注金额标记", orderNo);
  }

  const rawSubject = candidate.slice(0, markerMatch.index).trim().replace(/[,/]+$/, "");
  const pricePart = candidate.slice(markerMatch.index + markerMatch.marker.length).trim();
  const { playType, subject } = extractPlayType(rawSubject);

  if (!subject) {
    return buildException(candidate, sourceChunk, "未识别到投注内容", orderNo);
  }

  switch (playType) {
    case "平特":
      return parsePingteOrder(candidate, sourceChunk, orderNo, rawSubject, subject, markerMatch.marker, pricePart, oddsConfig);
    case "平特尾数":
      return parsePingteTailOrder(candidate, sourceChunk, orderNo, rawSubject, subject, markerMatch.marker, pricePart, oddsConfig);
    case "特码直投":
    default:
      return parseTemaDirectOrder(candidate, sourceChunk, orderNo, rawSubject, subject, markerMatch.marker, pricePart, referenceDate, oddsConfig);
  }
}

export function parseOrders(messageChunks: string[], referenceDate?: string | null, oddsConfig?: OddsConfigInput): ParseOrdersResult {
  const orders: ParsedOrder[] = [];
  const exceptions: OrderException[] = [];
  const preparedChunks = mergeRelatedChunks(messageChunks, referenceDate);

  for (const chunk of preparedChunks) {
    const sourceChunk = normalizeChunk(chunk);

    if (!sourceChunk || shouldIgnoreChunk(sourceChunk)) {
      continue;
    }

    const candidates = splitCandidates(chunk);

    for (const candidate of candidates) {
      const parsed = parseCandidate(candidate, sourceChunk, orders.length + 1, referenceDate, oddsConfig);

      if ("playType" in parsed) {
        orders.push(parsed);
        continue;
      }

      exceptions.push(buildException(parsed.raw, parsed.sourceChunk, parsed.reason, exceptions.length + 1));
    }
  }

  return {
    orders,
    exceptions
  };
}
