import type {
  DrawResultRecord,
  ExpectComputeCacheRecord,
  ExpectDetailComputed,
  LotteryType,
  MailRecord,
  MailRecordMeta,
  SessionUser,
  SnapshotMeta,
  SnapshotRecord,
  UserRecord
} from "@statisticalsystem/shared";
import { isMembershipExpired } from "../utils/time";

export type Env = {
  DB: D1Database;
  APP_ORIGIN: string;
  SUPER_PASSWORD?: string;
  MACAU_INBOX?: string;
  HONGKONG_INBOX?: string;
  DRAW_API_PRIMARY_URL?: string;
  DRAW_API_BACKUP_URL?: string;
  SESSION_TTL_DAYS?: string;
};

export type AppVariables = {
  sessionUser: SessionUser;
};

export type UserRow = {
  id: string;
  username: string;
  password_hash: string;
  role: "admin" | "user";
  account: string;
  status: "active" | "disabled";
  member_expires_on: string | null;
  created_at: string;
  updated_at: string;
};

export type SnapshotRow = {
  id: string;
  account: string;
  lottery_type: LotteryType;
  expect: string;
  received_at: string;
  mail_from: string | null;
  mail_subject: string | null;
  raw_body: string;
  message_chunks_json: string;
  created_at: string;
  updated_at: string;
};

export type MailRecordRow = {
  id: string;
  account: string;
  lottery_type: LotteryType;
  expect: string;
  received_at: string;
  mail_from: string | null;
  mail_subject: string | null;
  raw_body: string;
  message_chunks_json: string;
  created_at: string;
};

export type DrawRow = {
  lottery_type: LotteryType;
  expect: string;
  open_time: string;
  type: string;
  open_code: string;
  wave: string;
  zodiac: string;
  verify: number;
  source_payload: string;
  fetched_at: string;
  created_at: string;
  updated_at: string;
};

export type ExpectComputeCacheRow = {
  account: string;
  lottery_type: LotteryType;
  expect: string;
  parser_version: string;
  snapshot_updated_at: string;
  draw_updated_at: string | null;
  compute_status: "parsed" | "settled";
  order_count: number;
  exception_count: number;
  total_amount: number;
  win_amount: number | null;
  profit: number | null;
  computed_json: string;
  created_at: string;
  updated_at: string;
};

export type SessionRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
};

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    account: row.account,
    status: row.status,
    memberExpiresOn: row.member_expires_on,
    isExpired: isMembershipExpired(row.member_expires_on),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toSnapshotRecord(row: SnapshotRow): SnapshotRecord {
  return {
    id: row.id,
    account: row.account,
    lotteryType: row.lottery_type,
    expect: row.expect,
    receivedAt: row.received_at,
    mailFrom: row.mail_from,
    mailSubject: row.mail_subject,
    rawBody: row.raw_body,
    messageChunks: JSON.parse(row.message_chunks_json) as string[]
  };
}

export function toSnapshotMeta(row: SnapshotRow): SnapshotMeta {
  return {
    id: row.id,
    account: row.account,
    lotteryType: row.lottery_type,
    expect: row.expect,
    receivedAt: row.received_at,
    mailFrom: row.mail_from,
    mailSubject: row.mail_subject
  };
}

export function toMailRecord(row: MailRecordRow | SnapshotRow, isLatestSnapshot: boolean): MailRecord {
  return {
    id: row.id,
    account: row.account,
    lotteryType: row.lottery_type,
    expect: row.expect,
    receivedAt: row.received_at,
    mailFrom: row.mail_from,
    mailSubject: row.mail_subject,
    rawBody: row.raw_body,
    messageChunks: JSON.parse(row.message_chunks_json) as string[],
    isLatestSnapshot
  };
}

export function toMailRecordMeta(row: MailRecordRow | SnapshotRow, isLatestSnapshot: boolean): MailRecordMeta {
  return {
    id: row.id,
    account: row.account,
    lotteryType: row.lottery_type,
    expect: row.expect,
    receivedAt: row.received_at,
    mailFrom: row.mail_from,
    mailSubject: row.mail_subject,
    isLatestSnapshot
  };
}

export function toDrawRecord(row: DrawRow): DrawResultRecord {
  return {
    lotteryType: row.lottery_type,
    expect: row.expect,
    openTime: row.open_time,
    type: row.type,
    openCode: row.open_code,
    wave: row.wave,
    zodiac: row.zodiac,
    verify: Boolean(row.verify),
    sourcePayload: row.source_payload,
    fetchedAt: row.fetched_at
  };
}

export function toExpectDetailComputed(row: ExpectComputeCacheRow): ExpectDetailComputed {
  return JSON.parse(row.computed_json) as ExpectDetailComputed;
}

export function toExpectComputeCacheRecord(row: ExpectComputeCacheRow): ExpectComputeCacheRecord {
  const computed = toExpectDetailComputed(row);
  const rebateAmount = computed.summary.rebateAmount ?? roundCurrency(row.total_amount * 0.03);
  const houseProfitLoss = computed.summary.houseProfitLoss ?? row.profit;
  const finalProfitLoss =
    computed.summary.finalProfitLoss ?? (houseProfitLoss === null ? null : roundCurrency(houseProfitLoss - rebateAmount));

  return {
    account: row.account,
    lotteryType: row.lottery_type,
    expect: row.expect,
    parserVersion: row.parser_version,
    snapshotUpdatedAt: row.snapshot_updated_at,
    drawUpdatedAt: row.draw_updated_at,
    computeStatus: row.compute_status,
    orderCount: row.order_count,
    exceptionCount: row.exception_count,
    totalAmount: row.total_amount,
    winAmount: row.win_amount,
    houseProfitLoss,
    rebateAmount,
    finalProfitLoss,
    computed,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
