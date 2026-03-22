CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  account TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  member_expires_on TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role_status
ON users(role, status, member_expires_on, account);

CREATE TABLE IF NOT EXISTS expect_snapshots (
  id TEXT PRIMARY KEY,
  account TEXT NOT NULL,
  lottery_type TEXT NOT NULL CHECK (lottery_type IN ('macau', 'hongkong')),
  expect TEXT NOT NULL,
  received_at TEXT NOT NULL,
  mail_from TEXT,
  mail_subject TEXT,
  raw_body TEXT NOT NULL,
  message_chunks_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(account, lottery_type, expect),
  FOREIGN KEY(account) REFERENCES users(account)
);

CREATE INDEX IF NOT EXISTS idx_expect_snapshots_account_expect
ON expect_snapshots(account, lottery_type, expect DESC);

CREATE TABLE IF NOT EXISTS mail_records (
  id TEXT PRIMARY KEY,
  account TEXT NOT NULL,
  lottery_type TEXT NOT NULL CHECK (lottery_type IN ('macau', 'hongkong')),
  expect TEXT NOT NULL,
  received_at TEXT NOT NULL,
  mail_from TEXT,
  mail_subject TEXT,
  raw_body TEXT NOT NULL,
  message_chunks_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(account) REFERENCES users(account)
);

CREATE INDEX IF NOT EXISTS idx_mail_records_account_lottery_received
ON mail_records(account, lottery_type, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_mail_records_account_expect_received
ON mail_records(account, lottery_type, expect DESC, received_at DESC);

CREATE TABLE IF NOT EXISTS inbound_emails (
  id TEXT PRIMARY KEY,
  account TEXT NOT NULL,
  lottery_type TEXT NOT NULL CHECK (lottery_type IN ('macau', 'hongkong')),
  inbox TEXT NOT NULL,
  received_at TEXT NOT NULL,
  mail_from TEXT NOT NULL,
  mail_subject TEXT,
  raw_body TEXT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed')),
  processing_attempts INTEGER NOT NULL DEFAULT 0,
  processing_error TEXT,
  parsed_expect TEXT,
  message_chunks_json TEXT,
  processed_record_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(account) REFERENCES users(account),
  FOREIGN KEY(processed_record_id) REFERENCES mail_records(id)
);

CREATE INDEX IF NOT EXISTS idx_inbound_emails_status_received
ON inbound_emails(processing_status, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_inbound_emails_account_lottery_received
ON inbound_emails(account, lottery_type, received_at DESC);

CREATE TABLE IF NOT EXISTS expect_compute_cache (
  account TEXT NOT NULL,
  lottery_type TEXT NOT NULL CHECK (lottery_type IN ('macau', 'hongkong')),
  expect TEXT NOT NULL,
  parser_version TEXT NOT NULL,
  snapshot_updated_at TEXT NOT NULL,
  draw_updated_at TEXT,
  compute_status TEXT NOT NULL CHECK (compute_status IN ('parsed', 'settled')),
  order_count INTEGER NOT NULL DEFAULT 0,
  exception_count INTEGER NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  win_amount REAL,
  profit REAL,
  computed_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (account, lottery_type, expect),
  FOREIGN KEY(account, lottery_type, expect) REFERENCES expect_snapshots(account, lottery_type, expect)
);

CREATE INDEX IF NOT EXISTS idx_expect_compute_cache_account_expect
ON expect_compute_cache(account, lottery_type, expect DESC);

CREATE TABLE IF NOT EXISTS draw_results (
  lottery_type TEXT NOT NULL CHECK (lottery_type IN ('macau', 'hongkong')),
  expect TEXT NOT NULL,
  open_time TEXT NOT NULL,
  type TEXT NOT NULL,
  open_code TEXT NOT NULL,
  wave TEXT NOT NULL,
  zodiac TEXT NOT NULL,
  verify INTEGER NOT NULL DEFAULT 0,
  source_payload TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (lottery_type, expect)
);

CREATE INDEX IF NOT EXISTS idx_draw_results_open_time
ON draw_results(lottery_type, open_time DESC);

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
