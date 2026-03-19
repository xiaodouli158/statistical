import type { Marker, ParsedOrder, ParsedOrderStatus, ParsedOrderType } from "../types";
import { MARKERS } from "../constants/markers";
import { parseChineseNumber } from "../utils/chinese-number";
import { normalizeChunk, normalizeNumberToken } from "../utils/text";
import { extractZodiacs } from "../utils/zodiac";

const PRICE_UNIT_PATTERN = /(米|元|块|塊|斤)$/;

function splitCandidates(chunk: string): string[] {
  return normalizeChunk(chunk)
    .split(/[\n.;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
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

function detectOrderType(values: string[], zodiacs: string[]): ParsedOrderType {
  if (values.length > 0 && zodiacs.length === 0) {
    return "number";
  }

  if (zodiacs.length > 0 && values.length === 0) {
    return "zodiac";
  }

  if (zodiacs.length > 0 && values.length > 0) {
    return "mixed";
  }

  return "review";
}

function parseCandidate(candidate: string, orderNo: number): ParsedOrder {
  const markerMatch = findMarker(candidate);

  if (!markerMatch) {
    return {
      id: `${orderNo}-review`,
      orderNo,
      raw: candidate,
      content: candidate,
      marker: null,
      priceRaw: null,
      betCount: 0,
      unitPrice: 0,
      amount: 0,
      values: [],
      zodiacs: [],
      type: "review",
      status: "review"
    };
  }

  const subject = candidate.slice(0, markerMatch.index).trim().replace(/[,/]+$/, "");
  const pricePart = candidate.slice(markerMatch.index + markerMatch.marker.length).trim();
  const numbers = Array.from(subject.matchAll(/\d{1,2}/g)).map(([value]) => normalizeNumberToken(value));
  const zodiacs = extractZodiacs(subject);
  const type = detectOrderType(numbers, zodiacs);
  const status: ParsedOrderStatus = type === "review" || type === "mixed" ? "review" : "ok";
  const { priceRaw, unitPrice } = extractPrice(pricePart);
  const betCount = type === "zodiac" ? zodiacs.length : numbers.length;

  return {
    id: `${orderNo}-${numbers.join("-") || zodiacs.join("-") || "raw"}`,
    orderNo,
    raw: candidate,
    content: subject || candidate,
    marker: markerMatch.marker,
    priceRaw,
    betCount,
    unitPrice,
    amount: betCount * unitPrice,
    values: Array.from(new Set(numbers)),
    zodiacs,
    type,
    status
  };
}

export function parseOrders(messageChunks: string[]): ParsedOrder[] {
  const candidates = messageChunks.flatMap(splitCandidates);

  return candidates.map((candidate, index) => parseCandidate(candidate, index + 1));
}
