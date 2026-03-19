// packages/shared/dist/constants.js
var ZODIAC_SEQUENCE = ["\u9F20", "\u725B", "\u864E", "\u5154", "\u9F99", "\u86C7", "\u9A6C", "\u7F8A", "\u7334", "\u9E21", "\u72D7", "\u732A"];
var WAVE_COLORS = ["red", "blue", "green"];
var DEFAULT_TEMA_DIRECT_ODDS = 47;
var DEFAULT_PING_TE_ODDS = 2;
var DEFAULT_PING_TE_TAIL_ODDS = 1.8;
var NUMBER_ORDER_NATURAL = Array.from({ length: 49 }, (_, index) => String(index + 1).padStart(2, "0"));

// packages/shared/dist/number-mapping.js
var CHINESE_NEW_YEAR_START = {
  2024: "2024-02-10",
  2025: "2025-01-29",
  2026: "2026-02-17",
  2027: "2027-02-06",
  2028: "2028-01-26",
  2029: "2029-02-13",
  2030: "2030-02-03"
};
function resolveZodiacAnchorYear(input) {
  if (!input) {
    return (/* @__PURE__ */ new Date()).getUTCFullYear();
  }
  const dateText = input.slice(0, 10);
  const currentYear = Number(dateText.slice(0, 4));
  const threshold = CHINESE_NEW_YEAR_START[currentYear];
  if (!threshold) {
    return currentYear;
  }
  return dateText >= threshold ? currentYear : currentYear - 1;
}
function getZodiacForNumber(number, input) {
  const value = Number(number);
  const anchorYear = resolveZodiacAnchorYear(input);
  const yearIndex = ((anchorYear - 2020) % 12 + 12) % 12;
  const offset = ((value - 1) % 12 + 12) % 12;
  const zodiacIndex = (yearIndex - offset + 12) % 12;
  const zodiac = ZODIAC_SEQUENCE[zodiacIndex];
  if (!zodiac) {
    throw new Error(`Invalid zodiac index for number ${number}`);
  }
  return zodiac;
}
function getNumbersForZodiac(zodiac, input) {
  return NUMBER_ORDER_NATURAL.filter((number) => getZodiacForNumber(number, input) === zodiac);
}
function getSpecialDrawNumber(numbers) {
  return numbers.at(-1) ?? null;
}
function getSpecialDrawWave(waves) {
  return waves.at(-1) ?? null;
}
function getSpecialDrawZodiac(zodiacs) {
  return zodiacs.at(-1) ?? null;
}

// packages/parser/src/constants/zodiac.ts
var TRADITIONAL_TO_SIMPLIFIED_ZODIAC = {
  \u9F20: "\u9F20",
  \u725B: "\u725B",
  \u864E: "\u864E",
  \u5154: "\u5154",
  \u9F99: "\u9F99",
  \u9F8D: "\u9F99",
  \u86C7: "\u86C7",
  \u9A6C: "\u9A6C",
  \u99AC: "\u9A6C",
  \u7F8A: "\u7F8A",
  \u7334: "\u7334",
  \u9E21: "\u9E21",
  \u96DE: "\u9E21",
  \u72D7: "\u72D7",
  \u732A: "\u732A",
  \u8C6C: "\u732A"
};

// packages/parser/src/utils/zodiac.ts
function normalizeZodiacName(input) {
  const char = input.trim();
  return TRADITIONAL_TO_SIMPLIFIED_ZODIAC[char] ?? null;
}
function extractZodiacs(text) {
  const result = [];
  for (const char of text) {
    const zodiac = normalizeZodiacName(char);
    if (zodiac) {
      result.push(zodiac);
    }
  }
  return Array.from(new Set(result));
}

// packages/parser/src/aggregate/build-number-bars.ts
function buildNumberBars(orders, drawResult, referenceDate) {
  const amountMap = /* @__PURE__ */ new Map();
  const zodiacAnchor = drawResult?.openTime ?? referenceDate ?? `${(/* @__PURE__ */ new Date()).getUTCFullYear()}-01-01`;
  for (const order of orders) {
    if (order.playType !== "\u7279\u7801\u76F4\u6295" || order.values.length === 0 || order.unitPrice <= 0) {
      continue;
    }
    for (const value of order.values) {
      amountMap.set(value, (amountMap.get(value) ?? 0) + order.unitPrice);
    }
  }
  return NUMBER_ORDER_NATURAL.map((number, index) => ({
    number,
    amount: amountMap.get(number) ?? 0,
    isDrawn: drawResult ? drawResult.specialNumber === number : false,
    wave: drawResult && drawResult.specialNumber === number ? drawResult.specialWave : null,
    zodiac: getZodiacForNumber(number, zodiacAnchor)
  }));
}

// packages/parser/src/aggregate/build-summary-metrics.ts
function buildSummaryMetrics(orders) {
  const orderCount = orders.length;
  const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0);
  const hasPending = orders.some((order) => order.hitStatus === "pending");
  if (hasPending) {
    return {
      orderCount,
      winOrderCount: null,
      loseOrderCount: null,
      winAmount: null,
      totalAmount,
      profit: null
    };
  }
  const winOrderCount = orders.filter((order) => order.hitStatus === "win" || order.hitStatus === "partial").length;
  const loseOrderCount = orders.filter((order) => order.hitStatus === "lose").length;
  const winAmount = orders.reduce((sum, order) => sum + order.payout, 0);
  return {
    orderCount,
    winOrderCount,
    loseOrderCount,
    winAmount,
    totalAmount,
    profit: totalAmount - winAmount
  };
}

// packages/parser/src/aggregate/build-zodiac-bars.ts
function buildZodiacBars(orders, drawResult, referenceDate) {
  const amountMap = /* @__PURE__ */ new Map();
  const zodiacAnchor = drawResult?.openTime ?? referenceDate ?? `${(/* @__PURE__ */ new Date()).getUTCFullYear()}-01-01`;
  for (const order of orders) {
    if (order.playType !== "\u7279\u7801\u76F4\u6295") {
      continue;
    }
    for (const value of order.values) {
      const zodiac = getZodiacForNumber(value, zodiacAnchor);
      amountMap.set(zodiac, (amountMap.get(zodiac) ?? 0) + order.unitPrice);
    }
  }
  const drawnZodiacs = new Set(drawResult?.specialZodiac ? [drawResult.specialZodiac] : []);
  return ZODIAC_SEQUENCE.map((zodiac) => ({
    zodiac,
    amount: amountMap.get(zodiac) ?? 0,
    isDrawn: drawnZodiacs.has(zodiac)
  }));
}

// packages/parser/src/config/odds.ts
var DEFAULT_ODDS_CONFIG = {
  temaDirect: DEFAULT_TEMA_DIRECT_ODDS,
  pingte: DEFAULT_PING_TE_ODDS,
  pingteTail: DEFAULT_PING_TE_TAIL_ODDS
};
function normalizeOddsValue(input, fallback) {
  if (typeof input !== "number" || !Number.isFinite(input) || input <= 0) {
    return fallback;
  }
  return input;
}
function resolveOddsConfig(input) {
  return {
    temaDirect: normalizeOddsValue(input?.temaDirect, DEFAULT_ODDS_CONFIG.temaDirect),
    pingte: normalizeOddsValue(input?.pingte, DEFAULT_ODDS_CONFIG.pingte),
    pingteTail: normalizeOddsValue(input?.pingteTail, DEFAULT_ODDS_CONFIG.pingteTail)
  };
}
function getOddsForPlayType(playType, config) {
  switch (playType) {
    case "\u5E73\u7279":
      return config.pingte;
    case "\u5E73\u7279\u5C3E\u6570":
      return config.pingteTail;
    case "\u7279\u7801\u76F4\u6295":
    default:
      return config.temaDirect;
  }
}

// packages/parser/src/utils/text.ts
function normalizeChunk(input) {
  return input.replace(/[，、]/g, ",").replace(/[；;]/g, ";").replace(/[：:]/g, ":").replace(/[（]/g, "(").replace(/[）]/g, ")").replace(/[。]/g, ".").replace(/\s+/g, " ").trim();
}
function normalizeNumberToken(input) {
  return String(Number(input)).padStart(2, "0");
}

// packages/parser/src/normalize/normalize-draw-result.ts
function normalizeWave(input) {
  return input.split(",").map((item) => item.trim().toLowerCase()).filter((item) => WAVE_COLORS.includes(item));
}
function normalizeDrawResult(drawResult) {
  if (!drawResult) {
    return null;
  }
  const numbers = drawResult.openCode.split(",").map((item) => item.trim()).filter(Boolean).map(normalizeNumberToken);
  const zodiacs = drawResult.zodiac.split(",").map((item) => normalizeZodiacName(item)).filter((item) => item !== null);
  const waves = normalizeWave(drawResult.wave);
  return {
    expect: drawResult.expect,
    openTime: drawResult.openTime,
    type: drawResult.type,
    numbers,
    waves,
    zodiacs,
    specialNumber: getSpecialDrawNumber(numbers),
    specialWave: getSpecialDrawWave(waves),
    specialZodiac: getSpecialDrawZodiac(zodiacs),
    verify: drawResult.verify,
    raw: drawResult
  };
}

// packages/parser/src/constants/markers.ts
var MARKERS = ["\u5404\u6570", "\u5404\u4E2A", "\u5404\u53F7", "///", "---", "//", "--", "\u5404", "/", "-"];

// packages/parser/src/utils/chinese-number.ts
var DIGITS = {
  \u96F6: 0,
  \u4E00: 1,
  \u4E8C: 2,
  \u4E24: 2,
  \u4E09: 3,
  \u56DB: 4,
  \u4E94: 5,
  \u516D: 6,
  \u4E03: 7,
  \u516B: 8,
  \u4E5D: 9
};
var UNITS = {
  \u5341: 10,
  \u767E: 100,
  \u5343: 1e3
};
function parseChineseNumber(input) {
  const value = input.trim();
  if (!value) {
    return null;
  }
  if (/^\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  let total = 0;
  let current = 0;
  for (const char of value) {
    if (char in DIGITS) {
      current = DIGITS[char] ?? 0;
      continue;
    }
    if (char in UNITS) {
      const unit = UNITS[char] ?? 1;
      total += (current || 1) * unit;
      current = 0;
    }
  }
  total += current;
  return Number.isFinite(total) && total > 0 ? total : null;
}

// packages/parser/src/parse/parse-orders.ts
var PRICE_UNIT_PATTERN = /(米|元|块|塊|斤)$/;
var SEPARATOR_PATTERN = /[\s,，、。.;；]+/;
var CHINESE_NUMBER_PATTERN = /[零一二两三四五六七八九十百千]/;
var PLAY_TYPE_PREFIXES = [
  { prefix: "\u5E73\u7279\u5C3E\u6570", playType: "\u5E73\u7279\u5C3E\u6570" },
  { prefix: "\u5E73\u7279\u5C3E", playType: "\u5E73\u7279\u5C3E\u6570" },
  { prefix: "\u5E73\u7279\u8096", playType: "\u5E73\u7279" },
  { prefix: "\u5E73\u7279", playType: "\u5E73\u7279" }
];
function splitCandidates(chunk) {
  const candidates = [];
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
function findMarker(input, fromIndex = 0) {
  let result = null;
  for (const marker of MARKERS) {
    const index = input.indexOf(marker, fromIndex);
    if (index < 0) {
      continue;
    }
    if (!result || index < result.index || index === result.index && marker.length > result.marker.length) {
      result = { marker, index };
    }
  }
  return result;
}
function skipSeparators(input, startIndex) {
  let index = startIndex;
  while (index < input.length && SEPARATOR_PATTERN.test(input[index] ?? "")) {
    index += 1;
  }
  return index;
}
function isPlayTypePrefixAt(input, index) {
  return PLAY_TYPE_PREFIXES.some(({ prefix }) => input.startsWith(prefix, index));
}
function isPriceUnit(char) {
  return PRICE_UNIT_PATTERN.test(char);
}
function findPriceEnd(input, startIndex) {
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
function extractPrice(raw) {
  const clean = raw.replace(PRICE_UNIT_PATTERN, "");
  const parsed = parseChineseNumber(clean);
  return {
    priceRaw: clean || null,
    unitPrice: parsed ?? 0
  };
}
function buildZodiacSection(zodiacs, referenceDate) {
  const mappedNumbers = zodiacs.flatMap((zodiac) => getNumbersForZodiac(zodiac, referenceDate));
  return `${zodiacs.join(",")}(${mappedNumbers.join(", ")})`;
}
function buildZodiacList(zodiacs) {
  return zodiacs.join(", ");
}
function buildTailContent(tails) {
  return tails.map((tail) => `${tail}\u5C3E`).join(", ");
}
function buildContent(numbers, zodiacs, referenceDate) {
  const segments = [];
  if (numbers.length > 0) {
    segments.push(numbers.join(", "));
  }
  if (zodiacs.length > 0) {
    segments.push(buildZodiacSection(zodiacs, referenceDate));
  }
  return segments.join(", ");
}
function buildException(raw, sourceChunk, reason, index) {
  return {
    id: `exception-${index}`,
    raw,
    sourceChunk,
    reason
  };
}
function extractPlayType(subject) {
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
    playType: "\u7279\u7801\u76F4\u6295",
    subject: trimmed
  };
}
function normalizeTailToken(input) {
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
function extractTails(subject) {
  const tokens = subject.replace(/尾数/g, "").replace(/尾/g, "").split(/[^\d]+/).map((token) => normalizeTailToken(token)).filter((token) => Boolean(token));
  return Array.from(new Set(tokens));
}
function buildOrderId(orderNo, playType, values) {
  return `${orderNo}-${playType}-${values.join("-") || "raw"}`;
}
function parseTemaDirectOrder(candidate, sourceChunk, orderNo, rawSubject, subject, pricePart, referenceDate, oddsConfig) {
  const numbers = Array.from(subject.matchAll(/\d{1,2}/g)).map(([value]) => normalizeNumberToken(value));
  const zodiacs = extractZodiacs(subject);
  const zodiacNumbers = zodiacs.flatMap((zodiac) => getNumbersForZodiac(zodiac, referenceDate));
  const values = [...numbers, ...zodiacNumbers];
  const { priceRaw, unitPrice } = extractPrice(pricePart);
  if (values.length === 0) {
    return buildException(candidate, sourceChunk, "\u672A\u8BC6\u522B\u5230\u53F7\u7801\u6216\u751F\u8096", orderNo);
  }
  if (unitPrice <= 0) {
    return buildException(candidate, sourceChunk, "\u672A\u8BC6\u522B\u5230\u6709\u6548\u91D1\u989D", orderNo);
  }
  const resolvedOdds = resolveOddsConfig(oddsConfig);
  const content = buildContent(numbers, zodiacs, referenceDate) || subject || candidate;
  const betCount = values.length;
  return {
    id: buildOrderId(orderNo, "\u7279\u7801\u76F4\u6295", values),
    orderNo,
    raw: candidate,
    sourceContent: rawSubject || candidate,
    content,
    marker: findMarker(candidate)?.marker ?? "\u5404",
    priceRaw,
    betCount,
    unitPrice,
    amount: betCount * unitPrice,
    odds: getOddsForPlayType("\u7279\u7801\u76F4\u6295", resolvedOdds),
    values,
    zodiacs,
    tails: [],
    playType: "\u7279\u7801\u76F4\u6295",
    type: "number",
    status: "ok"
  };
}
function parsePingteOrder(candidate, sourceChunk, orderNo, rawSubject, subject, pricePart, oddsConfig) {
  const zodiacs = extractZodiacs(subject);
  const { priceRaw, unitPrice } = extractPrice(pricePart);
  if (zodiacs.length === 0) {
    return buildException(candidate, sourceChunk, "\u672A\u8BC6\u522B\u5230\u5E73\u7801\u751F\u8096", orderNo);
  }
  if (unitPrice <= 0) {
    return buildException(candidate, sourceChunk, "\u672A\u8BC6\u522B\u5230\u6709\u6548\u91D1\u989D", orderNo);
  }
  const resolvedOdds = resolveOddsConfig(oddsConfig);
  const values = [...zodiacs];
  return {
    id: buildOrderId(orderNo, "\u5E73\u7279", values),
    orderNo,
    raw: candidate,
    sourceContent: rawSubject || candidate,
    content: buildZodiacList(zodiacs),
    marker: findMarker(candidate)?.marker ?? "\u5404",
    priceRaw,
    betCount: zodiacs.length,
    unitPrice,
    amount: zodiacs.length * unitPrice,
    odds: getOddsForPlayType("\u5E73\u7279", resolvedOdds),
    values,
    zodiacs,
    tails: [],
    playType: "\u5E73\u7279",
    type: "zodiac",
    status: "ok"
  };
}
function parsePingteTailOrder(candidate, sourceChunk, orderNo, rawSubject, subject, pricePart, oddsConfig) {
  const tails = extractTails(subject);
  const { priceRaw, unitPrice } = extractPrice(pricePart);
  if (tails.length === 0) {
    return buildException(candidate, sourceChunk, "\u672A\u8BC6\u522B\u5230\u5E73\u7279\u5C3E\u6570", orderNo);
  }
  if (unitPrice <= 0) {
    return buildException(candidate, sourceChunk, "\u672A\u8BC6\u522B\u5230\u6709\u6548\u91D1\u989D", orderNo);
  }
  const resolvedOdds = resolveOddsConfig(oddsConfig);
  const values = tails.map((tail) => `${tail}\u5C3E`);
  return {
    id: buildOrderId(orderNo, "\u5E73\u7279\u5C3E\u6570", values),
    orderNo,
    raw: candidate,
    sourceContent: rawSubject || candidate,
    content: buildTailContent(tails),
    marker: findMarker(candidate)?.marker ?? "\u5404",
    priceRaw,
    betCount: tails.length,
    unitPrice,
    amount: tails.length * unitPrice,
    odds: getOddsForPlayType("\u5E73\u7279\u5C3E\u6570", resolvedOdds),
    values,
    zodiacs: [],
    tails,
    playType: "\u5E73\u7279\u5C3E\u6570",
    type: "tail",
    status: "ok"
  };
}
function parseCandidate(candidate, sourceChunk, orderNo, referenceDate, oddsConfig) {
  const markerMatch = findMarker(candidate);
  if (!markerMatch) {
    return buildException(candidate, sourceChunk, "\u672A\u8BC6\u522B\u5230\u4E0B\u6CE8\u91D1\u989D\u6807\u8BB0", orderNo);
  }
  const rawSubject = candidate.slice(0, markerMatch.index).trim().replace(/[,/]+$/, "");
  const pricePart = candidate.slice(markerMatch.index + markerMatch.marker.length).trim();
  const { playType, subject } = extractPlayType(rawSubject);
  if (!subject) {
    return buildException(candidate, sourceChunk, "\u672A\u8BC6\u522B\u5230\u6295\u6CE8\u5185\u5BB9", orderNo);
  }
  switch (playType) {
    case "\u5E73\u7279":
      return parsePingteOrder(candidate, sourceChunk, orderNo, rawSubject, subject, pricePart, oddsConfig);
    case "\u5E73\u7279\u5C3E\u6570":
      return parsePingteTailOrder(candidate, sourceChunk, orderNo, rawSubject, subject, pricePart, oddsConfig);
    case "\u7279\u7801\u76F4\u6295":
    default:
      return parseTemaDirectOrder(candidate, sourceChunk, orderNo, rawSubject, subject, pricePart, referenceDate, oddsConfig);
  }
}
function parseOrders(messageChunks, referenceDate, oddsConfig) {
  const orders = [];
  const exceptions = [];
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

// packages/parser/src/settle/settle-orders.ts
function uniqueZodiacs(input) {
  return Array.from(new Set(input));
}
function uniqueValues(input) {
  return Array.from(new Set(input));
}
function settleOrders(orders, drawResult) {
  if (!drawResult) {
    return orders.map((order) => ({
      ...order,
      hitStatus: "pending",
      hitValues: [],
      hitNumbers: [],
      hitZodiacs: [],
      hitTails: [],
      payout: 0,
      houseProfit: null
    }));
  }
  const specialNumberSet = new Set(drawResult.specialNumber ? [drawResult.specialNumber] : []);
  const drawZodiacSet = new Set(uniqueZodiacs(drawResult.zodiacs));
  const drawTailSet = new Set(uniqueValues(drawResult.numbers.map((value) => String(Number(value) % 10))));
  return orders.map((order) => {
    let hitValues = [];
    let hitNumbers = [];
    let hitZodiacs = [];
    let hitTails = [];
    switch (order.playType) {
      case "\u5E73\u7279":
        hitZodiacs = order.zodiacs.filter((value) => drawZodiacSet.has(value));
        hitValues = [...hitZodiacs];
        break;
      case "\u5E73\u7279\u5C3E\u6570":
        hitTails = order.tails.filter((value) => drawTailSet.has(value));
        hitValues = hitTails.map((value) => `${value}\u5C3E`);
        break;
      case "\u7279\u7801\u76F4\u6295":
      default:
        hitNumbers = order.values.filter((value) => specialNumberSet.has(value));
        hitZodiacs = order.zodiacs.filter((value) => drawResult.specialZodiac === value);
        hitValues = [...hitNumbers];
        break;
    }
    const hitCount = hitValues.length;
    const payout = hitCount * order.unitPrice * order.odds;
    return {
      ...order,
      hitStatus: hitCount === 0 ? "lose" : hitCount === order.values.length ? "win" : "partial",
      hitValues,
      hitNumbers,
      hitZodiacs,
      hitTails,
      payout,
      houseProfit: order.amount - payout
    };
  });
}
export {
  DEFAULT_ODDS_CONFIG,
  buildNumberBars,
  buildSummaryMetrics,
  buildZodiacBars,
  extractZodiacs,
  getNumbersForZodiac,
  getOddsForPlayType,
  getZodiacForNumber,
  normalizeDrawResult,
  normalizeZodiacName,
  parseOrders,
  resolveOddsConfig,
  settleOrders
};
