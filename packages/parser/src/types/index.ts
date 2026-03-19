import type { DrawResultRecord, NumberSortMode, OrderFilter, WaveColor, ZodiacName } from "@statisticalsystem/shared";

export type Marker = "各数" | "///" | "---" | "//" | "--" | "各" | "/" | "-";

export type ParsedOrderType = "number" | "zodiac" | "mixed" | "review";

export type ParsedOrderStatus = "ok" | "review";

export type ParsedOrder = {
  id: string;
  orderNo: number;
  raw: string;
  content: string;
  marker: Marker | null;
  priceRaw: string | null;
  betCount: number;
  unitPrice: number;
  amount: number;
  values: string[];
  zodiacs: ZodiacName[];
  type: ParsedOrderType;
  status: ParsedOrderStatus;
};

export type NormalizedDrawResult = {
  expect: string;
  openTime: string;
  type: string;
  numbers: string[];
  waves: WaveColor[];
  zodiacs: ZodiacName[];
  verify: boolean;
  raw: DrawResultRecord;
};

export type HitStatus = "pending" | "win" | "lose" | "partial" | "review";

export type SettledOrder = ParsedOrder & {
  hitStatus: HitStatus;
  hitNumbers: string[];
  hitZodiacs: ZodiacName[];
  payout: number;
  resultText: string;
};

export type SummaryMetrics = {
  orderCount: number;
  winOrderCount: number;
  loseOrderCount: number;
  winAmount: number;
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
