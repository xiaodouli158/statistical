import type { ZodiacName } from "@statisticalsystem/shared";
import { getOddsForPlayType, resolveOddsConfig } from "../config/odds";
import type { Marker, OddsConfigInput, OrderException, ParsedOrder, ParseOrdersResult, PlayType } from "../types";
import { MARKERS } from "../constants/markers";
import { parseChineseNumber } from "../utils/chinese-number";
import { normalizeChunk, normalizeNumberToken } from "../utils/text";
import { extractZodiacs, getNumbersForZodiac } from "../utils/zodiac";

const PRICE_UNIT_PATTERN = /(米|元|块|塊|斤)$/;
const SEPARATOR_PATTERN = /[\s,，、。.;；]+/;
const CHINESE_NUMBER_PATTERN = /[零一二两三四五六七八九十百千]/;
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

function parseTemaDirectOrder(
  candidate: string,
  sourceChunk: string,
  orderNo: number,
  rawSubject: string,
  subject: string,
  pricePart: string,
  referenceDate: string | null | undefined,
  oddsConfig: OddsConfigInput | undefined
): ParsedOrder | OrderException {
  const numbers = Array.from(subject.matchAll(/\d{1,2}/g)).map(([value]) => normalizeNumberToken(value));
  const zodiacs = extractZodiacs(subject);
  const zodiacNumbers = zodiacs.flatMap((zodiac) => getNumbersForZodiac(zodiac, referenceDate));
  const values = [...numbers, ...zodiacNumbers];
  const { priceRaw, unitPrice } = extractPrice(pricePart);

  if (values.length === 0) {
    return buildException(candidate, sourceChunk, "未识别到号码或生肖", orderNo);
  }

  if (unitPrice <= 0) {
    return buildException(candidate, sourceChunk, "未识别到有效金额", orderNo);
  }

  const resolvedOdds = resolveOddsConfig(oddsConfig);
  const content = buildContent(numbers, zodiacs, referenceDate) || subject || candidate;
  const betCount = values.length;

  return {
    id: buildOrderId(orderNo, "特码直投", values),
    orderNo,
    raw: candidate,
    sourceContent: rawSubject || candidate,
    content,
    marker: findMarker(candidate)?.marker ?? "各",
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
    marker: findMarker(candidate)?.marker ?? "各",
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
    marker: findMarker(candidate)?.marker ?? "各",
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
      return parsePingteOrder(candidate, sourceChunk, orderNo, rawSubject, subject, pricePart, oddsConfig);
    case "平特尾数":
      return parsePingteTailOrder(candidate, sourceChunk, orderNo, rawSubject, subject, pricePart, oddsConfig);
    case "特码直投":
    default:
      return parseTemaDirectOrder(candidate, sourceChunk, orderNo, rawSubject, subject, pricePart, referenceDate, oddsConfig);
  }
}

export function parseOrders(messageChunks: string[], referenceDate?: string | null, oddsConfig?: OddsConfigInput): ParseOrdersResult {
  const orders: ParsedOrder[] = [];
  const exceptions: OrderException[] = [];

  for (const chunk of messageChunks) {
    const sourceChunk = normalizeChunk(chunk);
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
