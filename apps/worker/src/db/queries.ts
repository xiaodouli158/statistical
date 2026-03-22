import type {
  AdminMailRecordListItem,
  AdminDataResponse,
  AdminExpectDetailResponse,
  DrawResultRecord,
  ExpectDetailComputed,
  ExpectDetailResponse,
  LotteryType,
  MailRecord,
  SessionUser,
  SnapshotRecord,
  UpsertUserRequest,
  UserExpectListItem,
  UserRecord
} from "@statisticalsystem/shared";
import { buildNumberBars, buildSummaryMetrics, normalizeDrawResult, parseOrders, resolveOddsConfig, settleOrders } from "@statisticalsystem/parser";
import { normalizeEmailAddress } from "../utils/strings";
import { formatNowIso, getBeijingDateString, normalizeMemberExpiresOn } from "../utils/time";
import type { DrawRow, Env, ExpectComputeCacheRow, MailRecordRow, SessionRow, SnapshotRow, UserRow } from "./types";
import {
  toDrawRecord,
  toExpectComputeCacheRecord,
  toExpectDetailComputed,
  toMailRecord,
  toMailRecordMeta,
  toSnapshotMeta,
  toSnapshotRecord,
  toUserRecord
} from "./types";

const HIDDEN_SYSTEM_ACCOUNT = "c0000";
const PROTECTED_ADMIN_ACCOUNTS = new Set(["c0000", "c0001"]);
const EXPECT_COMPUTE_PARSER_VERSION = "v2";
const ORDER_ODDS_CONFIG = resolveOddsConfig();

type ExpectSource = Pick<SnapshotRecord, "messageChunks" | "receivedAt">;

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

function isProtectedAdminAccount(role: UserRecord["role"], account: string): boolean {
  return role === "admin" && PROTECTED_ADMIN_ACCOUNTS.has(account);
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

function buildExpectDetailComputed(snapshot: ExpectSource, drawResult: DrawResultRecord | null): ExpectDetailComputed {
  const normalizedDrawResult = normalizeDrawResult(drawResult);
  const parsed = parseOrders(snapshot.messageChunks, normalizedDrawResult?.openTime ?? snapshot.receivedAt, ORDER_ODDS_CONFIG);
  const settledOrders = settleOrders(parsed.orders, normalizedDrawResult);

  return {
    settledOrders,
    orderExceptions: parsed.exceptions,
    summary: buildSummaryMetrics(settledOrders),
    numberBarsBase: buildNumberBars(settledOrders, normalizedDrawResult, snapshot.receivedAt)
  };
}

async function getSnapshotRowForAccountExpect(
  env: Env,
  account: string,
  lotteryType: LotteryType,
  expect: string
): Promise<SnapshotRow | null> {
  return first<SnapshotRow>(
    env.DB.prepare("SELECT * FROM expect_snapshots WHERE account = ? AND lottery_type = ? AND expect = ? LIMIT 1").bind(account, lotteryType, expect)
  );
}

async function listSnapshotRowsForExpect(env: Env, lotteryType: LotteryType, expect: string): Promise<SnapshotRow[]> {
  return all<SnapshotRow>(
    env.DB.prepare("SELECT * FROM expect_snapshots WHERE lottery_type = ? AND expect = ? ORDER BY account ASC").bind(lotteryType, expect)
  );
}

async function getLatestSnapshotRowForAccount(
  env: Env,
  account: string,
  lotteryType: LotteryType
): Promise<SnapshotRow | null> {
  return first<SnapshotRow>(
    env.DB.prepare(
      `SELECT *
       FROM expect_snapshots
       WHERE account = ?
         AND lottery_type = ?
       ORDER BY expect DESC, received_at DESC
       LIMIT 1`
    ).bind(account, lotteryType)
  );
}

async function getMailRecordRowById(env: Env, id: string): Promise<MailRecordRow | null> {
  return first<MailRecordRow>(env.DB.prepare("SELECT * FROM mail_records WHERE id = ? LIMIT 1").bind(id));
}

async function getDrawRowForExpect(env: Env, lotteryType: LotteryType, expect: string): Promise<DrawRow | null> {
  return first<DrawRow>(env.DB.prepare("SELECT * FROM draw_results WHERE lottery_type = ? AND expect = ? LIMIT 1").bind(lotteryType, expect));
}

async function getExpectComputeCacheRow(
  env: Env,
  account: string,
  lotteryType: LotteryType,
  expect: string
): Promise<ExpectComputeCacheRow | null> {
  return first<ExpectComputeCacheRow>(
    env.DB.prepare("SELECT * FROM expect_compute_cache WHERE account = ? AND lottery_type = ? AND expect = ? LIMIT 1").bind(account, lotteryType, expect)
  );
}

function isExpectComputeCacheFresh(
  snapshotRow: SnapshotRow,
  drawRow: DrawRow | null,
  cacheRow: ExpectComputeCacheRow | null
): cacheRow is ExpectComputeCacheRow {
  if (!cacheRow) {
    return false;
  }

  return (
    cacheRow.parser_version === EXPECT_COMPUTE_PARSER_VERSION &&
    cacheRow.snapshot_updated_at === snapshotRow.updated_at &&
    cacheRow.draw_updated_at === (drawRow?.updated_at ?? null)
  );
}

async function upsertExpectComputeCache(
  env: Env,
  snapshotRow: SnapshotRow,
  drawRow: DrawRow | null,
  computed: ExpectDetailComputed
): Promise<void> {
  const now = formatNowIso();
  const drawUpdatedAt = drawRow?.updated_at ?? null;
  const computeStatus = drawRow ? "settled" : "parsed";

  await env.DB.prepare(
    `INSERT INTO expect_compute_cache (
        account, lottery_type, expect, parser_version, snapshot_updated_at, draw_updated_at,
        compute_status, order_count, exception_count, total_amount, win_amount, profit,
        computed_json, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(account, lottery_type, expect) DO UPDATE SET
        parser_version = excluded.parser_version,
        snapshot_updated_at = excluded.snapshot_updated_at,
        draw_updated_at = excluded.draw_updated_at,
        compute_status = excluded.compute_status,
        order_count = excluded.order_count,
        exception_count = excluded.exception_count,
        total_amount = excluded.total_amount,
        win_amount = excluded.win_amount,
        profit = excluded.profit,
        computed_json = excluded.computed_json,
        updated_at = excluded.updated_at`
  )
    .bind(
      snapshotRow.account,
      snapshotRow.lottery_type,
      snapshotRow.expect,
      EXPECT_COMPUTE_PARSER_VERSION,
      snapshotRow.updated_at,
      drawUpdatedAt,
      computeStatus,
      computed.summary.orderCount,
      computed.orderExceptions.length,
      computed.summary.totalAmount,
      computed.summary.winAmount,
      computed.summary.profit,
      JSON.stringify(computed),
      now,
      now
    )
    .run();
}

function buildExpectDetailResponse(
  snapshotRow: SnapshotRow,
  drawRow: DrawRow | null,
  computed: ExpectDetailComputed
): ExpectDetailResponse {
  return {
    lotteryType: snapshotRow.lottery_type,
    snapshot: toSnapshotMeta(snapshotRow),
    drawResult: drawRow ? toDrawRecord(drawRow) : null,
    computed
  };
}

function buildAdminDetailResponse(record: MailRecord, drawRow: DrawRow | null, computed: ExpectDetailComputed): ExpectDetailResponse {
  return {
    lotteryType: record.lotteryType,
    snapshot: {
      id: record.id,
      account: record.account,
      lotteryType: record.lotteryType,
      expect: record.expect,
      receivedAt: record.receivedAt,
      mailFrom: record.mailFrom,
      mailSubject: record.mailSubject
    },
    drawResult: drawRow ? toDrawRecord(drawRow) : null,
    computed
  };
}

async function ensureExpectComputeCache(
  env: Env,
  snapshotRow: SnapshotRow,
  drawRow: DrawRow | null
): Promise<ExpectDetailComputed> {
  const existingCache = await getExpectComputeCacheRow(env, snapshotRow.account, snapshotRow.lottery_type, snapshotRow.expect);

  if (isExpectComputeCacheFresh(snapshotRow, drawRow, existingCache)) {
    return toExpectDetailComputed(existingCache);
  }

  const computed = buildExpectDetailComputed(toSnapshotRecord(snapshotRow), drawRow ? toDrawRecord(drawRow) : null);
  await upsertExpectComputeCache(env, snapshotRow, drawRow, computed);
  return computed;
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
  const rows = await all<UserRow>(
    env.DB.prepare("SELECT * FROM users WHERE account <> ? ORDER BY role ASC, account ASC").bind(HIDDEN_SYSTEM_ACCOUNT)
  );
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

  if (existing.account === HIDDEN_SYSTEM_ACCOUNT) {
    throw new Error("Superadmin cannot be modified");
  }

  const now = formatNowIso();
  const protectedAdmin = isProtectedAdminAccount(existing.role, existing.account);
  const role = protectedAdmin ? "admin" : input.role;
  const username = protectedAdmin ? existing.username : normalizeUsernameOrThrow(input.username, role);
  const memberExpiresOn = protectedAdmin
    ? null
    : normalizeMemberExpiryForRole(input.memberExpiresOn, role);
  const status = protectedAdmin ? "active" : input.status;
  const passwordHash = input.passwordHash ?? existing.password_hash;

  await env.DB.prepare(
    `UPDATE users
     SET username = ?, password_hash = ?, role = ?, status = ?, member_expires_on = ?, updated_at = ?
     WHERE id = ?`
  )
    .bind(username, passwordHash, role, status, memberExpiresOn, now, id)
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
  const rows = await all<{
    expect: string;
    received_at: string;
    has_draw_result: number;
    lottery_type: LotteryType;
    order_count: number | null;
    win_amount: number | null;
    profit: number | null;
  }>(
    env.DB.prepare(
      `SELECT
         snapshots.expect,
         snapshots.received_at,
         snapshots.lottery_type,
         CASE WHEN draws.expect IS NULL THEN 0 ELSE 1 END AS has_draw_result,
         compute.order_count,
         compute.win_amount,
         compute.profit
       FROM expect_snapshots AS snapshots
       LEFT JOIN draw_results AS draws
         ON draws.expect = snapshots.expect
        AND draws.lottery_type = snapshots.lottery_type
       LEFT JOIN expect_compute_cache AS compute
         ON compute.account = snapshots.account
        AND compute.lottery_type = snapshots.lottery_type
        AND compute.expect = snapshots.expect
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
    orderCount: row.order_count ?? 0,
    winAmount: row.win_amount,
    profit: row.profit
  }));
}

export async function getLatestExpectForAccount(env: Env, account: string, lotteryType: LotteryType): Promise<UserExpectListItem | null> {
  const row = await first<{
    expect: string;
    received_at: string;
    has_draw_result: number;
    lottery_type: LotteryType;
    order_count: number | null;
    win_amount: number | null;
    profit: number | null;
  }>(
    env.DB.prepare(
      `SELECT
         snapshots.expect,
         snapshots.received_at,
         snapshots.lottery_type,
         CASE WHEN draws.expect IS NULL THEN 0 ELSE 1 END AS has_draw_result,
         compute.order_count,
         compute.win_amount,
         compute.profit
       FROM expect_snapshots AS snapshots
       LEFT JOIN draw_results AS draws
         ON draws.expect = snapshots.expect
        AND draws.lottery_type = snapshots.lottery_type
       LEFT JOIN expect_compute_cache AS compute
         ON compute.account = snapshots.account
        AND compute.lottery_type = snapshots.lottery_type
        AND compute.expect = snapshots.expect
       WHERE snapshots.account = ?
         AND snapshots.lottery_type = ?
       ORDER BY snapshots.expect DESC, snapshots.received_at DESC
       LIMIT 1`
    ).bind(account, lotteryType)
  );

  if (!row) {
    return null;
  }

  return {
    lotteryType: row.lottery_type,
    expect: row.expect,
    receivedAt: row.received_at,
    hasDrawResult: Boolean(row.has_draw_result),
    orderCount: row.order_count ?? 0,
    winAmount: row.win_amount,
    profit: row.profit
  };
}

export async function listAdminMailRecords(
  env: Env,
  account: string,
  lotteryType: LotteryType,
  expect?: string
): Promise<AdminMailRecordListItem[]> {
  const statement = expect
    ? env.DB.prepare(
        `SELECT
           records.*,
           CASE WHEN draws.expect IS NULL THEN 0 ELSE 1 END AS has_draw_result,
           CASE WHEN snapshots.id = records.id THEN 1 ELSE 0 END AS is_latest_snapshot
         FROM mail_records AS records
         LEFT JOIN draw_results AS draws
           ON draws.expect = records.expect
          AND draws.lottery_type = records.lottery_type
         LEFT JOIN expect_snapshots AS snapshots
           ON snapshots.account = records.account
          AND snapshots.lottery_type = records.lottery_type
          AND snapshots.expect = records.expect
         WHERE records.account = ?
           AND records.lottery_type = ?
           AND records.expect = ?
         ORDER BY records.expect DESC, records.received_at DESC, records.id DESC`
      ).bind(account, lotteryType, expect)
    : env.DB.prepare(
        `SELECT
           records.*,
           CASE WHEN draws.expect IS NULL THEN 0 ELSE 1 END AS has_draw_result,
           CASE WHEN snapshots.id = records.id THEN 1 ELSE 0 END AS is_latest_snapshot
         FROM mail_records AS records
         LEFT JOIN draw_results AS draws
           ON draws.expect = records.expect
          AND draws.lottery_type = records.lottery_type
         LEFT JOIN expect_snapshots AS snapshots
           ON snapshots.account = records.account
          AND snapshots.lottery_type = records.lottery_type
          AND snapshots.expect = records.expect
         WHERE records.account = ?
           AND records.lottery_type = ?
         ORDER BY records.expect DESC, records.received_at DESC, records.id DESC`
      ).bind(account, lotteryType);

  const rows = await all<MailRecordRow & { has_draw_result: number; is_latest_snapshot: number }>(statement);

  return rows.map((row) => ({
    ...toMailRecordMeta(row, Boolean(row.is_latest_snapshot)),
    hasDrawResult: Boolean(row.has_draw_result)
  }));
}

export async function getSnapshotForAccountExpect(env: Env, account: string, lotteryType: LotteryType, expect: string): Promise<SnapshotRecord | null> {
  const row = await getSnapshotRowForAccountExpect(env, account, lotteryType, expect);
  return row ? toSnapshotRecord(row) : null;
}

export async function getDrawForExpect(env: Env, lotteryType: LotteryType, expect: string): Promise<DrawResultRecord | null> {
  const row = await getDrawRowForExpect(env, lotteryType, expect);
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
  const snapshotRow = await getSnapshotRowForAccountExpect(env, account, lotteryType, expect);

  if (!snapshotRow) {
    return null;
  }

  const drawRow = await getDrawRowForExpect(env, lotteryType, expect);
  const computed = await ensureExpectComputeCache(env, snapshotRow, drawRow);

  return buildExpectDetailResponse(snapshotRow, drawRow, computed);
}

export async function getAdminExpectDetail(
  env: Env,
  account: string,
  lotteryType: LotteryType,
  expect: string
): Promise<AdminExpectDetailResponse | null> {
  const snapshotRow = await getSnapshotRowForAccountExpect(env, account, lotteryType, expect);

  if (!snapshotRow) {
    return null;
  }

  const drawRow = await getDrawRowForExpect(env, lotteryType, expect);
  const computed = await ensureExpectComputeCache(env, snapshotRow, drawRow);
  const computeCacheRow = await getExpectComputeCacheRow(env, account, lotteryType, expect);

  return {
    ...buildExpectDetailResponse(snapshotRow, drawRow, computed),
    rawRecord: toMailRecord(snapshotRow, true),
    computeCache: computeCacheRow ? toExpectComputeCacheRecord(computeCacheRow) : null
  };
}

export async function getAdminMailRecordDetail(env: Env, recordId: string): Promise<AdminExpectDetailResponse | null> {
  const recordRow = await getMailRecordRowById(env, recordId);

  if (!recordRow) {
    return null;
  }

  const [latestSnapshotRow, drawRow] = await Promise.all([
    getSnapshotRowForAccountExpect(env, recordRow.account, recordRow.lottery_type, recordRow.expect),
    getDrawRowForExpect(env, recordRow.lottery_type, recordRow.expect)
  ]);
  const isLatestSnapshot = latestSnapshotRow?.id === recordRow.id;
  const record = toMailRecord(recordRow, isLatestSnapshot);
  const computed = buildExpectDetailComputed(record, drawRow ? toDrawRecord(drawRow) : null);
  const computeCacheRow =
    isLatestSnapshot && latestSnapshotRow
      ? await getExpectComputeCacheRow(env, recordRow.account, recordRow.lottery_type, recordRow.expect)
      : null;

  return {
    ...buildAdminDetailResponse(record, drawRow, computed),
    rawRecord: record,
    computeCache: computeCacheRow ? toExpectComputeCacheRecord(computeCacheRow) : null
  };
}

export async function refreshExpectComputeCacheForAccount(
  env: Env,
  account: string,
  lotteryType: LotteryType,
  expect: string
): Promise<void> {
  const snapshotRow = await getSnapshotRowForAccountExpect(env, account, lotteryType, expect);

  if (!snapshotRow) {
    return;
  }

  const drawRow = await getDrawRowForExpect(env, lotteryType, expect);
  const computed = buildExpectDetailComputed(toSnapshotRecord(snapshotRow), drawRow ? toDrawRecord(drawRow) : null);
  await upsertExpectComputeCache(env, snapshotRow, drawRow, computed);
}

export async function refreshExpectComputeCacheForExpect(env: Env, lotteryType: LotteryType, expect: string): Promise<void> {
  const [snapshotRows, drawRow] = await Promise.all([listSnapshotRowsForExpect(env, lotteryType, expect), getDrawRowForExpect(env, lotteryType, expect)]);

  for (const snapshotRow of snapshotRows) {
    const computed = buildExpectDetailComputed(toSnapshotRecord(snapshotRow), drawRow ? toDrawRecord(drawRow) : null);
    await upsertExpectComputeCache(env, snapshotRow, drawRow, computed);
  }
}

export async function upsertSnapshot(env: Env, input: {
  id: string;
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
        id = excluded.id,
        received_at = excluded.received_at,
        mail_from = excluded.mail_from,
        mail_subject = excluded.mail_subject,
        raw_body = excluded.raw_body,
        message_chunks_json = excluded.message_chunks_json,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
      WHERE excluded.received_at >= expect_snapshots.received_at`
  )
    .bind(
      input.id,
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

export async function insertMailRecord(env: Env, input: {
  id: string;
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
    `INSERT INTO mail_records (
        id, account, lottery_type, expect, received_at, mail_from, mail_subject,
        raw_body, message_chunks_json, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      input.id,
      input.account,
      input.lotteryType,
      input.expect,
      input.receivedAt,
      input.mailFrom,
      input.mailSubject,
      input.rawBody,
      JSON.stringify(input.messageChunks),
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
