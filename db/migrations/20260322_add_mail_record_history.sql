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

INSERT OR IGNORE INTO mail_records (
  id,
  account,
  lottery_type,
  expect,
  received_at,
  mail_from,
  mail_subject,
  raw_body,
  message_chunks_json,
  created_at
)
SELECT
  id,
  account,
  lottery_type,
  expect,
  received_at,
  mail_from,
  mail_subject,
  raw_body,
  message_chunks_json,
  created_at
FROM expect_snapshots;
