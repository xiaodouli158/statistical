import { DEFAULT_NUMBER_ODDS, type ZodiacName } from "@statisticalsystem/shared";
import type { Marker, OrderException, ParsedOrder, ParseOrdersResult } from "../types";
import { MARKERS } from "../constants/markers";
import { parseChineseNumber } from "../utils/chinese-number";
import { normalizeChunk, normalizeNumberToken } from "../utils/text";
import { extractZodiacs, getNumbersForZodiac } from "../utils/zodiac";

const PRICE_UNIT_PATTERN = /(米|元|块|塊|斤)$/;

function splitCandidates(chunk: string): string[] {
  const source = chunk.replace(/\r\n/g, "\n").replace(/[；;]/g, ";").replace(/[。]/g, ".");
  const candidates: string[] = [];
  let buffer = "";

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index] ?? "";
    const prev = source[index - 1] ?? "";
    const next = source[index + 1] ?? "";
    const shouldSplitByDot = char === "." && (!/\d/.test(prev) || !/\d/.test(next));

    if (char === "\n" || char === ";" || shouldSplitByDot) {
      const candidate = normalizeChunk(buffer);

      if (candidate) {
        candidates.push(candidate);
      }

      buffer = "";
      continue;
    }

    buffer += char;
  }

  const tail = normalizeChunk(buffer);

  if (tail) {
    candidates.push(tail);
  }

  return candidates;
}

function findMarker(input: string): { marker: Marker; index: number } | null {
  for (const marker of MARKERS) {
    const index = input.indexOf(marker);

    if (index >= 0) {
      return { marker, index };
    }
  }

  return null;
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

function parseCandidate(candidate: string, sourceChunk: string, orderNo: number, referenceDate: string | null | undefined): ParsedOrder | OrderException {
  const markerMatch = findMarker(candidate);

  if (!markerMatch) {
    return buildException(candidate, sourceChunk, "未识别到下注金额标记", orderNo);
  }

  const subject = candidate.slice(0, markerMatch.index).trim().replace(/[,/]+$/, "");
  const pricePart = candidate.slice(markerMatch.index + markerMatch.marker.length).trim();
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

  const content = buildContent(numbers, zodiacs, referenceDate) || subject || candidate;
  const betCount = values.length;

  return {
    id: `${orderNo}-${numbers.join("-") || zodiacs.join("-") || "raw"}`,
    orderNo,
    raw: candidate,
    sourceContent: subject || candidate,
    content,
    marker: markerMatch.marker,
    priceRaw,
    betCount,
    unitPrice,
    amount: betCount * unitPrice,
    odds: DEFAULT_NUMBER_ODDS,
    values,
    zodiacs,
    playType: "特码直投",
    type: "number",
    status: "ok"
  };
}

export function parseOrders(messageChunks: string[], referenceDate?: string | null): ParseOrdersResult {
  const orders: ParsedOrder[] = [];
  const exceptions: OrderException[] = [];

  for (const chunk of messageChunks) {
    const sourceChunk = normalizeChunk(chunk);
    const candidates = splitCandidates(chunk);

    for (const candidate of candidates) {
      const parsed = parseCandidate(candidate, sourceChunk, orders.length + 1, referenceDate);

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
