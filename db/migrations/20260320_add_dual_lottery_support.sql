PRAGMA foreign_keys=off;

ALTER TABLE accounts RENAME TO accounts_legacy_20260320;

CREATE TABLE accounts (
  account TEXT PRIMARY KEY,
  macau_inbox TEXT,
  hongkong_inbox TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO accounts (account, macau_inbox, hongkong_inbox, enabled, created_at, updated_at)
SELECT account, inbox, NULL, enabled, created_at, updated_at
FROM accounts_legacy_20260320;

DROP TABLE accounts_legacy_20260320;

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_macau_inbox_unique
ON accounts(macau_inbox)
WHERE macau_inbox IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_hongkong_inbox_unique
ON accounts(hongkong_inbox)
WHERE hongkong_inbox IS NOT NULL;

ALTER TABLE expect_snapshots RENAME TO expect_snapshots_legacy_20260320;

CREATE TABLE expect_snapshots (
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
  FOREIGN KEY(account) REFERENCES accounts(account)
);

INSERT INTO expect_snapshots (
  id, account, lottery_type, expect, received_at, mail_from, mail_subject,
  raw_body, message_chunks_json, created_at, updated_at
)
SELECT
  id, account, 'macau', expect, received_at, mail_from, mail_subject,
  raw_body, message_chunks_json, created_at, updated_at
FROM expect_snapshots_legacy_20260320;

DROP TABLE expect_snapshots_legacy_20260320;

CREATE INDEX IF NOT EXISTS idx_expect_snapshots_account_lottery_expect
ON expect_snapshots(account, lottery_type, expect DESC);

ALTER TABLE draw_results RENAME TO draw_results_legacy_20260320;

CREATE TABLE draw_results (
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

INSERT INTO draw_results (
  lottery_type, expect, open_time, type, open_code, wave, zodiac, verify,
  source_payload, fetched_at, created_at, updated_at
)
SELECT
  'macau', expect, open_time, type, open_code, wave, zodiac, verify,
  source_payload, fetched_at, created_at, updated_at
FROM draw_results_legacy_20260320;

DROP TABLE draw_results_legacy_20260320;

CREATE INDEX IF NOT EXISTS idx_draw_results_lottery_open_time
ON draw_results(lottery_type, open_time DESC);

PRAGMA foreign_keys=on;
