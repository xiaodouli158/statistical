import type {
  AccountRecord,
  AdminDataResponse,
  DrawResultRecord,
  ExpectDetailResponse,
  SessionUser,
  SnapshotRecord,
  UpsertAccountRequest,
  UpsertUserRequest,
  UserExpectListItem,
  UserRecord
} from "@statisticalsystem/shared";
import { formatNowIso } from "../utils/time";
import type { AccountRow, DrawRow, Env, SessionRow, SnapshotRow, UserRow } from "./types";
import { toAccountRecord, toDrawRecord, toSnapshotRecord, toUserRecord } from "./types";

async function first<T>(statement: D1PreparedStatement): Promise<T | null> {
  return (await statement.first<T>()) ?? null;
}

async function all<T>(statement: D1PreparedStatement): Promise<T[]> {
  const result = await statement.all<T>();
  return result.results ?? [];
}

export async function getUserByUsername(env: Env, username: string): Promise<(UserRecord & { passwordHash: string }) | null> {
  const row = await first<UserRow>(
    env.DB.prepare("SELECT * FROM users WHERE username = ? LIMIT 1").bind(username)
  );

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
  const rows = await all<UserRow>(env.DB.prepare("SELECT * FROM users ORDER BY created_at DESC"));
  return rows.map(toUserRecord);
}

export async function createUser(env: Env, input: UpsertUserRequest & { passwordHash: string }): Promise<UserRecord> {
  const now = formatNowIso();
  const id = crypto.randomUUID();

  await env.DB.prepare(
    "INSERT INTO users (id, username, password_hash, role, account, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(id, input.username, input.passwordHash, input.role, input.account, input.status, now, now)
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
  const passwordHash = input.passwordHash ?? existing.password_hash;

  await env.DB.prepare(
    "UPDATE users SET username = ?, password_hash = ?, role = ?, account = ?, status = ?, updated_at = ? WHERE id = ?"
  )
    .bind(input.username, passwordHash, input.role, input.account, input.status, now, id)
    .run();

  return getUserById(env, id);
}

export async function listAccounts(env: Env): Promise<AccountRecord[]> {
  const rows = await all<AccountRow>(env.DB.prepare("SELECT * FROM accounts ORDER BY account ASC"));
  return rows.map(toAccountRecord);
}

export async function getAccountByInbox(env: Env, inbox: string): Promise<AccountRecord | null> {
  const row = await first<AccountRow>(env.DB.prepare("SELECT * FROM accounts WHERE lower(inbox) = lower(?) LIMIT 1").bind(inbox));
  return row ? toAccountRecord(row) : null;
}

export async function getAccount(env: Env, account: string): Promise<AccountRecord | null> {
  const row = await first<AccountRow>(env.DB.prepare("SELECT * FROM accounts WHERE account = ? LIMIT 1").bind(account));
  return row ? toAccountRecord(row) : null;
}

export async function createAccount(env: Env, account: string, input: UpsertAccountRequest): Promise<AccountRecord> {
  const now = formatNowIso();

  await env.DB.prepare(
    "INSERT INTO accounts (account, inbox, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(account, input.inbox, input.enabled ? 1 : 0, now, now)
    .run();

  const created = await getAccount(env, account);

  if (!created) {
    throw new Error("Failed to create account");
  }

  return created;
}

export async function updateAccount(env: Env, account: string, input: UpsertAccountRequest): Promise<AccountRecord | null> {
  const now = formatNowIso();

  await env.DB.prepare("UPDATE accounts SET inbox = ?, enabled = ?, updated_at = ? WHERE account = ?")
    .bind(input.inbox, input.enabled ? 1 : 0, now, account)
    .run();

  return getAccount(env, account);
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

  const row = await first<
    UserRow & SessionRow
  >(
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

  return {
    id: row.id,
    username: row.username,
    role: row.role,
    account: row.account
  };
}

export async function listExpectsForAccount(env: Env, account: string): Promise<UserExpectListItem[]> {
  const rows = await all<{ expect: string; received_at: string; has_draw_result: number }>(
    env.DB.prepare(
      `SELECT snapshots.expect, snapshots.received_at, CASE WHEN draws.expect IS NULL THEN 0 ELSE 1 END AS has_draw_result
       FROM expect_snapshots AS snapshots
       LEFT JOIN draw_results AS draws ON draws.expect = snapshots.expect
       WHERE snapshots.account = ?
       ORDER BY snapshots.expect DESC`
    ).bind(account)
  );

  return rows.map((row) => ({
    expect: row.expect,
    receivedAt: row.received_at,
    hasDrawResult: Boolean(row.has_draw_result),
    orderCount: 0,
    winAmount: null,
    profit: null
  }));
}

export async function getSnapshotForAccountExpect(env: Env, account: string, expect: string): Promise<SnapshotRecord | null> {
  const row = await first<SnapshotRow>(
    env.DB.prepare("SELECT * FROM expect_snapshots WHERE account = ? AND expect = ? LIMIT 1").bind(account, expect)
  );
  return row ? toSnapshotRecord(row) : null;
}

export async function getDrawForExpect(env: Env, expect: string): Promise<DrawResultRecord | null> {
  const row = await first<DrawRow>(env.DB.prepare("SELECT * FROM draw_results WHERE expect = ? LIMIT 1").bind(expect));
  return row ? toDrawRecord(row) : null;
}

export async function getAdminData(env: Env, account: string, expect: string): Promise<AdminDataResponse> {
  const [snapshot, drawResult] = await Promise.all([
    getSnapshotForAccountExpect(env, account, expect),
    getDrawForExpect(env, expect)
  ]);

  return {
    snapshot,
    drawResult
  };
}

export async function getExpectDetail(env: Env, account: string, expect: string): Promise<ExpectDetailResponse | null> {
  const snapshot = await getSnapshotForAccountExpect(env, account, expect);

  if (!snapshot) {
    return null;
  }

  const drawResult = await getDrawForExpect(env, expect);

  return {
    snapshot,
    drawResult
  };
}

export async function upsertSnapshot(env: Env, input: {
  account: string;
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
        id, account, expect, received_at, mail_from, mail_subject,
        raw_body, message_chunks_json, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(account, expect) DO UPDATE SET
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
        expect, open_time, type, open_code, wave, zodiac, verify,
        source_payload, fetched_at, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(expect) DO UPDATE SET
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
