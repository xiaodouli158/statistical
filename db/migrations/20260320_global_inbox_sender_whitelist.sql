PRAGMA foreign_keys=off;

ALTER TABLE accounts RENAME TO accounts_legacy_20260320_global_inbox_sender_whitelist;

CREATE TABLE accounts (
  account TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO accounts (account, enabled, created_at, updated_at)
SELECT account, enabled, created_at, updated_at
FROM accounts_legacy_20260320_global_inbox_sender_whitelist;

DROP TABLE accounts_legacy_20260320_global_inbox_sender_whitelist;

CREATE TABLE account_sender_whitelist (
  id TEXT PRIMARY KEY,
  sender_email TEXT NOT NULL UNIQUE,
  account TEXT NOT NULL,
  allow_macau INTEGER NOT NULL DEFAULT 1,
  allow_hongkong INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(account) REFERENCES accounts(account)
);

CREATE INDEX IF NOT EXISTS idx_account_sender_whitelist_account
ON account_sender_whitelist(account, sender_email);

WITH sender_stats AS (
  SELECT
    lower(trim(mail_from)) AS sender_email,
    account,
    MAX(CASE WHEN lottery_type = 'macau' THEN 1 ELSE 0 END) AS allow_macau,
    MAX(CASE WHEN lottery_type = 'hongkong' THEN 1 ELSE 0 END) AS allow_hongkong,
    MIN(created_at) AS created_at,
    MAX(updated_at) AS updated_at
  FROM expect_snapshots
  WHERE mail_from IS NOT NULL
    AND trim(mail_from) <> ''
  GROUP BY lower(trim(mail_from)), account
),
unique_senders AS (
  SELECT sender_email
  FROM sender_stats
  GROUP BY sender_email
  HAVING COUNT(*) = 1
)
INSERT INTO account_sender_whitelist (
  id, sender_email, account, allow_macau, allow_hongkong, enabled, created_at, updated_at
)
SELECT
  lower(hex(randomblob(16))),
  sender_stats.sender_email,
  sender_stats.account,
  sender_stats.allow_macau,
  sender_stats.allow_hongkong,
  1,
  sender_stats.created_at,
  sender_stats.updated_at
FROM sender_stats
JOIN unique_senders ON unique_senders.sender_email = sender_stats.sender_email;

PRAGMA foreign_keys=on;
