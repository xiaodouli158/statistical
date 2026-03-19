import type { ZODIAC_SEQUENCE, WAVE_COLORS } from "./constants";

export type Role = "admin" | "user";

export type UserStatus = "active" | "disabled";

export type NumberSortMode = "natural" | "amountDesc";

export type OrderFilter = "all" | "win" | "lose";

export type WaveColor = (typeof WAVE_COLORS)[number];

export type ZodiacName = (typeof ZODIAC_SEQUENCE)[number];

export type SnapshotRecord = {
  id: string;
  account: string;
  expect: string;
  receivedAt: string;
  mailFrom: string | null;
  mailSubject: string | null;
  rawBody: string;
  messageChunks: string[];
};

export type DrawResultRecord = {
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
  account: string | null;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
};

export type AccountRecord = {
  account: string;
  inbox: string;
  enabled: boolean;
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
  account: string | null;
};

export type LoginResponse = {
  user: SessionUser;
};

export type UserExpectListItem = {
  expect: string;
  receivedAt: string;
  orderCount: number;
  winAmount: number | null;
  profit: number | null;
  hasDrawResult: boolean;
};

export type ExpectDetailResponse = {
  snapshot: SnapshotRecord;
  drawResult: DrawResultRecord | null;
};

export type AdminDataResponse = {
  snapshot: SnapshotRecord | null;
  drawResult: DrawResultRecord | null;
};

export type UpsertUserRequest = {
  username: string;
  password?: string;
  role: Role;
  account: string | null;
  status: UserStatus;
};

export type UpsertAccountRequest = {
  inbox: string;
  enabled: boolean;
};
