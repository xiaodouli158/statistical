import type { DrawResultRecord, NumberSortMode, OrderFilter, WaveColor, ZodiacName } from "@statisticalsystem/shared";

export type Marker = "各数" | "各个" | "各号" | "///" | "---" | "//" | "--" | "各" | "/" | "-";

export type ParsedOrderType = "number" | "zodiac" | "tail";

export type ParsedOrderStatus = "ok";

export type PlayType = "特码直投" | "平特" | "平特尾数";

export type OddsConfig = {
  temaDirect: number;
  pingte: number;
  pingteTail: number;
};

export type OddsConfigInput = Partial<OddsConfig>;

export type ParsedOrder = {
  id: string;
  orderNo: number;
  raw: string;
  sourceContent: string;
  content: string;
  marker: Marker;
  priceRaw: string | null;
  betCount: number;
  unitPrice: number;
  amount: number;
  odds: number;
  values: string[];
  zodiacs: ZodiacName[];
  tails: string[];
  playType: PlayType;
  type: ParsedOrderType;
  status: ParsedOrderStatus;
};

export type OrderException = {
  id: string;
  raw: string;
  sourceChunk: string;
  reason: string;
};

export type ParseOrdersResult = {
  orders: ParsedOrder[];
  exceptions: OrderException[];
};

export type NormalizedDrawResult = {
  expect: string;
  openTime: string;
  type: string;
  numbers: string[];
  waves: WaveColor[];
  zodiacs: ZodiacName[];
  specialNumber: string | null;
  specialWave: WaveColor | null;
  specialZodiac: ZodiacName | null;
  verify: boolean;
  raw: DrawResultRecord;
};

export type HitStatus = "pending" | "win" | "lose" | "partial" | "review";

export type SettledOrder = ParsedOrder & {
  hitStatus: HitStatus;
  hitValues: string[];
  hitNumbers: string[];
  hitZodiacs: ZodiacName[];
  hitTails: string[];
  payout: number;
  houseProfit: number | null;
};

export type SummaryMetrics = {
  orderCount: number;
  winOrderCount: number | null;
  loseOrderCount: number | null;
  winAmount: number | null;
  totalAmount: number;
  profit: number | null;
};

export type NumberBarItem = {
  number: string;
  amount: number;
  isDrawn: boolean;
  wave: WaveColor | null;
  zodiac: ZodiacName | null;
};

export type ZodiacBarItem = {
  zodiac: ZodiacName;
  amount: number;
  isDrawn: boolean;
};

export type DetailViewState = {
  orderFilter: OrderFilter;
  orderKeyword: string;
  numberSortMode: NumberSortMode;
  zodiacSortMode: NumberSortMode;
  showAllNumberBars: boolean;
  showAllZodiacBars: boolean;
};
