import type {
  AdminDataResponse,
  DrawResultRecord,
  ExpectDetailResponse,
  LotteryType,
  SessionUser,
  SnapshotRecord,
  UpsertUserRequest,
  UserExpectListItem,
  UserRecord
} from "@statisticalsystem/shared";
import { normalizeEmailAddress } from "../utils/strings";
import { formatNowIso, getBeijingDateString, isMembershipExpired, normalizeMemberExpiresOn } from "../utils/time";
import type { DrawRow, Env, SessionRow, SnapshotRow, UserRow } from "./types";
import { toDrawRecord, toSnapshotRecord, toUserRecord } from "./types";

async function first<T>(statement: D1PreparedStatement): Promise<T | null> {
  return (await statement.first<T>()) ?? null;
}

async function all<T>(statement: D1PreparedStatement): Promise<T[]> {
  const result = await statement.all<T>();
  return result.results ?? [];
}

function normalizeLookupUsername(value: string | null | undefined): string | null {
  const email = normalizeEmailAddress(value);

  if (email) {
    return email;
  }

  const trimmed = value?.trim().toLowerCase() ?? "";
  return trimmed || null;
}

function normalizeUsernameOrThrow(value: string | null | undefined, role: UserRecord["role"]): string {
  const normalized = normalizeLookupUsername(value);

  if (!normalized) {
    throw new Error("Username is required");
  }

  if (role === "user" && !normalizeEmailAddress(normalized)) {
    throw new Error("User email is invalid");
  }

  return normalized;
}

function normalizeMemberExpiryForRole(value: string | null | undefined, role: UserRecord["role"]): string | null {
  const normalized = normalizeMemberExpiresOn(value);

  if (role === "user" && !normalized) {
    throw new Error("Membership expiry is required for users");
  }

  return normalized;
}

function isUserAccessible(user: Pick<UserRecord, "status" | "isExpired">): boolean {
  return user.status === "active" && !user.isExpired;
}

async function generateNextAccountCode(env: Env): Promise<string> {
  const row = await first<{ account: string | null }>(
    env.DB.prepare(
      `SELECT account
       FROM users
       WHERE account GLOB 'c[0-9]*'
       ORDER BY CAST(substr(account, 2) AS INTEGER) DESC
       LIMIT 1`
    )
  );

  const currentValue = row?.account ? Number.parseInt(row.account.slice(1), 10) : 0;
  const nextValue = Number.isFinite(currentValue) ? currentValue + 1 : 1;
  return `c${String(nextValue).padStart(4, "0")}`;
}

export async function getUserByUsername(env: Env, username: string): Promise<(UserRecord & { passwordHash: string }) | null> {
  const normalizedUsername = normalizeLookupUsername(username);

  if (!normalizedUsername) {
    return null;
  }

  const row = await first<UserRow>(env.DB.prepare("SELECT * FROM users WHERE username = ? LIMIT 1").bind(normalizedUsername));

  if (!row) {
    return null;
  }

  return {
    ...toUserRecord(row),
    passwordHash: row.password_hash
  };
}

export async function getUserById(env: Env, id: string): Promise<UserRecord | null> {
  const row = await first<UserRow>(env.DB.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").bind(id));
  return row ? toUserRecord(row) : null;
}

export async function listUsers(env: Env): Promise<UserRecord[]> {
  const rows = await all<UserRow>(env.DB.prepare("SELECT * FROM users ORDER BY role ASC, account ASC"));
  return rows.map(toUserRecord);
}

export async function createUser(env: Env, input: UpsertUserRequest & { passwordHash: string }): Promise<UserRecord> {
  const now = formatNowIso();
  const id = crypto.randomUUID();
  const account = await generateNextAccountCode(env);
  const username = normalizeUsernameOrThrow(input.username, input.role);
  const memberExpiresOn = normalizeMemberExpiryForRole(input.memberExpiresOn, input.role);

  await env.DB.prepare(
    `INSERT INTO users (
        id, username, password_hash, role, account, status, member_expires_on, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, username, input.passwordHash, input.role, account, input.status, memberExpiresOn, now, now)
    .run();

  const created = await getUserById(env, id);

  if (!created) {
    throw new Error("Failed to create user");
  }

  return created;
}

export async function updateUser(
  env: Env,
  id: string,
  input: UpsertUserRequest & { passwordHash?: string }
): Promise<UserRecord | null> {
  const existing = await first<UserRow>(env.DB.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").bind(id));

  if (!existing) {
    return null;
  }

  const now = formatNowIso();
  const username = normalizeUsernameOrThrow(input.username, input.role);
  const memberExpiresOn = normalizeMemberExpiryForRole(input.memberExpiresOn, input.role);
  const passwordHash = input.passwordHash ?? existing.password_hash;

  await env.DB.prepare(
    `UPDATE users
     SET username = ?, password_hash = ?, role = ?, status = ?, member_expires_on = ?, updated_at = ?
     WHERE id = ?`
  )
    .bind(username, passwordHash, input.role, input.status, memberExpiresOn, now, id)
    .run();

  return getUserById(env, id);
}

export async function getActiveMailUserBySender(env: Env, senderEmail: string): Promise<UserRecord | null> {
  const normalizedSender = normalizeEmailAddress(senderEmail);

  if (!normalizedSender) {
    return null;
  }

  const row = await first<UserRow>(
    env.DB.prepare(
      `SELECT *
       FROM users
       WHERE role = 'user'
         AND username = ?
         AND status = 'active'
         AND (member_expires_on IS NULL OR member_expires_on >= ?)
       LIMIT 1`
    ).bind(normalizedSender, getBeijingDateString())
  );

  return row ? toUserRecord(row) : null;
}

export async function createSession(env: Env, userId: string, tokenHash: string, expiresAt: string): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(crypto.randomUUID(), userId, tokenHash, expiresAt, formatNowIso())
    .run();
}

export async function deleteSession(env: Env, tokenHash: string): Promise<void> {
  await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
}

export async function getSessionUser(env: Env, tokenHash: string): Promise<SessionUser | null> {
  const now = formatNowIso();
  const row = await first<UserRow & SessionRow>(
    env.DB.prepare(
      `SELECT users.*, sessions.expires_at
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ?
         AND sessions.expires_at > ?
       LIMIT 1`
    ).bind(tokenHash, now)
  );

  if (!row) {
    return null;
  }

  const user = toUserRecord(row);

  if (!isUserAccessible(user)) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    account: user.account
  };
}

export async function listExpectsForAccount(env: Env, account: string, lotteryType: LotteryType): Promise<UserExpectListItem[]> {
  const rows = await all<{ expect: string; received_at: string; has_draw_result: number; lottery_type: LotteryType }>(
    env.DB.prepare(
      `SELECT snapshots.expect, snapshots.received_at, snapshots.lottery_type, CASE WHEN draws.expect IS NULL THEN 0 ELSE 1 END AS has_draw_result
       FROM expect_snapshots AS snapshots
       LEFT JOIN draw_results AS draws
         ON draws.expect = snapshots.expect
        AND draws.lottery_type = snapshots.lottery_type
       WHERE snapshots.account = ?
         AND snapshots.lottery_type = ?
       ORDER BY snapshots.expect DESC`
    ).bind(account, lotteryType)
  );

  return rows.map((row) => ({
    lotteryType: row.lottery_type,
    expect: row.expect,
    receivedAt: row.received_at,
    hasDrawResult: Boolean(row.has_draw_result),
    orderCount: 0,
    winAmount: null,
    profit: null
  }));
}

export async function getSnapshotForAccountExpect(env: Env, account: string, lotteryType: LotteryType, expect: string): Promise<SnapshotRecord | null> {
  const row = await first<SnapshotRow>(
    env.DB.prepare("SELECT * FROM expect_snapshots WHERE account = ? AND lottery_type = ? AND expect = ? LIMIT 1").bind(account, lotteryType, expect)
  );
  return row ? toSnapshotRecord(row) : null;
}

export async function getDrawForExpect(env: Env, lotteryType: LotteryType, expect: string): Promise<DrawResultRecord | null> {
  const row = await first<DrawRow>(env.DB.prepare("SELECT * FROM draw_results WHERE lottery_type = ? AND expect = ? LIMIT 1").bind(lotteryType, expect));
  return row ? toDrawRecord(row) : null;
}

export async function getAdminData(env: Env, account: string, expect: string, lotteryType: LotteryType): Promise<AdminDataResponse> {
  const [snapshot, drawResult] = await Promise.all([
    getSnapshotForAccountExpect(env, account, lotteryType, expect),
    getDrawForExpect(env, lotteryType, expect)
  ]);

  return {
    lotteryType,
    snapshot,
    drawResult
  };
}

export async function getExpectDetail(env: Env, account: string, lotteryType: LotteryType, expect: string): Promise<ExpectDetailResponse | null> {
  const snapshot = await getSnapshotForAccountExpect(env, account, lotteryType, expect);

  if (!snapshot) {
    return null;
  }

  const drawResult = await getDrawForExpect(env, lotteryType, expect);

  return {
    lotteryType,
    snapshot,
    drawResult
  };
}

export async function upsertSnapshot(env: Env, input: {
  account: string;
  lotteryType: LotteryType;
  expect: string;
  receivedAt: string;
  mailFrom: string | null;
  mailSubject: string | null;
  rawBody: string;
  messageChunks: string[];
}): Promise<void> {
  const now = formatNowIso();

  await env.DB.prepare(
    `INSERT INTO expect_snapshots (
        id, account, lottery_type, expect, received_at, mail_from, mail_subject,
        raw_body, message_chunks_json, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(account, lottery_type, expect) DO UPDATE SET
        received_at = excluded.received_at,
        mail_from = excluded.mail_from,
        mail_subject = excluded.mail_subject,
        raw_body = excluded.raw_body,
        message_chunks_json = excluded.message_chunks_json,
        updated_at = excluded.updated_at
      WHERE excluded.received_at >= expect_snapshots.received_at`
  )
    .bind(
      crypto.randomUUID(),
      input.account,
      input.lotteryType,
      input.expect,
      input.receivedAt,
      input.mailFrom,
      input.mailSubject,
      input.rawBody,
      JSON.stringify(input.messageChunks),
      now,
      now
    )
    .run();
}

export async function upsertDrawResult(env: Env, input: DrawResultRecord & { sourcePayload: string; fetchedAt: string }): Promise<void> {
  const now = formatNowIso();

  await env.DB.prepare(
    `INSERT INTO draw_results (
        lottery_type, expect, open_time, type, open_code, wave, zodiac, verify,
        source_payload, fetched_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(lottery_type, expect) DO UPDATE SET
        open_time = excluded.open_time,
        type = excluded.type,
        open_code = excluded.open_code,
        wave = excluded.wave,
        zodiac = excluded.zodiac,
        verify = excluded.verify,
        source_payload = excluded.source_payload,
        fetched_at = excluded.fetched_at,
        updated_at = excluded.updated_at`
  )
    .bind(
      input.lotteryType,
      input.expect,
      input.openTime,
      input.type,
      input.openCode,
      input.wave,
      input.zodiac,
      input.verify ? 1 : 0,
      input.sourcePayload,
      input.fetchedAt,
      now,
      now
    )
    .run();
}
