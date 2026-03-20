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

export type ExpectDetailResponse = {
  lotteryType: LotteryType;
  snapshot: SnapshotRecord;
  drawResult: DrawResultRecord | null;
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
