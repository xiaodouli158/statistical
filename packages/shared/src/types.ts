import type { LOTTERY_TYPES, ZODIAC_SEQUENCE, WAVE_COLORS } from "./constants";

export type Role = "admin" | "user";

export type UserStatus = "active" | "disabled";

export type NumberSortMode = "natural" | "amountDesc";

export type OrderFilter = "all" | "win" | "lose";

export type WaveColor = (typeof WAVE_COLORS)[number];

export type ZodiacName = (typeof ZODIAC_SEQUENCE)[number];

export type LotteryType = (typeof LOTTERY_TYPES)[number];

export type SnapshotRecord = {
  id: string;
  account: string;
  lotteryType: LotteryType;
  expect: string;
  receivedAt: string;
  mailFrom: string | null;
  mailSubject: string | null;
  rawBody: string;
  messageChunks: string[];
};

export type SnapshotMeta = {
  id: string;
  account: string;
  lotteryType: LotteryType;
  expect: string;
  receivedAt: string;
  mailFrom: string | null;
  mailSubject: string | null;
};

export type DrawResultRecord = {
  lotteryType: LotteryType;
  expect: string;
  openTime: string;
  type: string;
  openCode: string;
  wave: string;
  zodiac: string;
  verify: boolean;
  sourcePayload?: string;
  fetchedAt?: string;
};

export type Marker = string;

export type ParsedOrderType = "number" | "zodiac" | "tail";

export type ParsedOrderStatus = "ok";

export type PlayType = "特码直投" | "平特" | "平特尾数";

export type HitStatus = "pending" | "win" | "lose" | "partial" | "review";

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

export type ExpectDetailComputed = {
  settledOrders: SettledOrder[];
  orderExceptions: OrderException[];
  summary: SummaryMetrics;
  numberBarsBase: NumberBarItem[];
};

export type ExpectComputeCacheRecord = {
  account: string;
  lotteryType: LotteryType;
  expect: string;
  parserVersion: string;
  snapshotUpdatedAt: string;
  drawUpdatedAt: string | null;
  computeStatus: "parsed" | "settled";
  orderCount: number;
  exceptionCount: number;
  totalAmount: number;
  winAmount: number | null;
  profit: number | null;
  computed: ExpectDetailComputed;
  createdAt: string;
  updatedAt: string;
};

export type UserRecord = {
  id: string;
  username: string;
  role: Role;
  account: string;
  status: UserStatus;
  memberExpiresOn: string | null;
  isExpired: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type SessionUser = {
  id: string;
  username: string;
  role: Role;
  account: string;
};

export type LoginResponse = {
  user: SessionUser;
};

export type UserExpectListItem = {
  lotteryType: LotteryType;
  expect: string;
  receivedAt: string;
  orderCount: number;
  winAmount: number | null;
  profit: number | null;
  hasDrawResult: boolean;
};

export type ExpectDetailViewResponse = {
  lotteryType: LotteryType;
  snapshot: SnapshotMeta;
  drawResult: DrawResultRecord | null;
  computed: ExpectDetailComputed;
};

export type ExpectDetailResponse = ExpectDetailViewResponse;

export type AdminExpectDetailResponse = ExpectDetailViewResponse & {
  rawSnapshot: SnapshotRecord;
  computeCache: ExpectComputeCacheRecord | null;
};

export type AdminDataResponse = {
  lotteryType: LotteryType;
  snapshot: SnapshotRecord | null;
  drawResult: DrawResultRecord | null;
};

export type UpsertUserRequest = {
  username: string;
  password?: string;
  role: Role;
  status: UserStatus;
  memberExpiresOn: string | null;
};
