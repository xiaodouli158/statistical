import type { AccountRecord, DrawResultRecord, SessionUser, SnapshotRecord, UserRecord } from "@statisticalsystem/shared";

export type Env = {
  DB: D1Database;
  APP_ORIGIN: string;
  DRAW_API_URL?: string;
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
  account: string | null;
  status: "active" | "disabled";
  created_at: string;
  updated_at: string;
};

export type AccountRow = {
  account: string;
  inbox: string;
  enabled: number;
  created_at: string;
  updated_at: string;
};

export type SnapshotRow = {
  id: string;
  account: string;
  expect: string;
  received_at: string;
  mail_from: string | null;
  mail_subject: string | null;
  raw_body: string;
  message_chunks_json: string;
};

export type DrawRow = {
  expect: string;
  open_time: string;
  type: string;
  open_code: string;
  wave: string;
  zodiac: string;
  verify: number;
  source_payload: string;
  fetched_at: string;
};

export type SessionRow = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
};

export function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    account: row.account,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toAccountRecord(row: AccountRow): AccountRecord {
  return {
    account: row.account,
    inbox: row.inbox,
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toSnapshotRecord(row: SnapshotRow): SnapshotRecord {
  return {
    id: row.id,
    account: row.account,
    expect: row.expect,
    receivedAt: row.received_at,
    mailFrom: row.mail_from,
    mailSubject: row.mail_subject,
    rawBody: row.raw_body,
    messageChunks: JSON.parse(row.message_chunks_json) as string[]
  };
}

export function toDrawRecord(row: DrawRow): DrawResultRecord {
  return {
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
