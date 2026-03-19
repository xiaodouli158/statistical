CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  account TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_account_unique
ON users(account)
WHERE account IS NOT NULL;

CREATE TABLE IF NOT EXISTS accounts (
  account TEXT PRIMARY KEY,
  inbox TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS expect_snapshots (
  id TEXT PRIMARY KEY,
  account TEXT NOT NULL,
  expect TEXT NOT NULL,
  received_at TEXT NOT NULL,
  mail_from TEXT,
  mail_subject TEXT,
  raw_body TEXT NOT NULL,
  message_chunks_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(account, expect),
  FOREIGN KEY(account) REFERENCES accounts(account)
);

CREATE INDEX IF NOT EXISTS idx_expect_snapshots_account_expect
ON expect_snapshots(account, expect DESC);

CREATE TABLE IF NOT EXISTS draw_results (
  expect TEXT PRIMARY KEY,
  open_time TEXT NOT NULL,
  type TEXT NOT NULL,
  open_code TEXT NOT NULL,
  wave TEXT NOT NULL,
  zodiac TEXT NOT NULL,
  verify INTEGER NOT NULL DEFAULT 0,
  source_payload TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_draw_results_open_time
ON draw_results(open_time DESC);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS unresolved_emails (
  id TEXT PRIMARY KEY,
  inbox TEXT NOT NULL,
  received_at TEXT NOT NULL,
  reason TEXT NOT NULL,
  raw_body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
