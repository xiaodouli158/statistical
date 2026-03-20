PRAGMA foreign_keys=off;

DROP INDEX IF EXISTS idx_users_account_unique;
DROP INDEX IF EXISTS idx_account_sender_whitelist_account;
DROP INDEX IF EXISTS idx_expect_snapshots_account_expect;
DROP INDEX IF EXISTS idx_sessions_expires_at;

ALTER TABLE users RENAME TO users_legacy_20260320_users_only_management;
ALTER TABLE accounts RENAME TO accounts_legacy_20260320_users_only_management;
ALTER TABLE account_sender_whitelist RENAME TO account_sender_whitelist_legacy_20260320_users_only_management;
ALTER TABLE expect_snapshots RENAME TO expect_snapshots_legacy_20260320_users_only_management;
ALTER TABLE sessions RENAME TO sessions_legacy_20260320_users_only_management;

CREATE TABLE account_code_map_20260320_users_only_management (
  old_account TEXT PRIMARY KEY,
  new_account TEXT NOT NULL UNIQUE
);

WITH combined_accounts(account) AS (
  SELECT account FROM accounts_legacy_20260320_users_only_management
  UNION ALL
  SELECT account FROM users_legacy_20260320_users_only_management
  UNION ALL
  SELECT account FROM expect_snapshots_legacy_20260320_users_only_management
),
legacy_accounts AS (
  SELECT DISTINCT lower(trim(account)) AS old_account
  FROM combined_accounts
  WHERE account IS NOT NULL
    AND trim(account) <> ''
),
normalized AS (
  SELECT
    old_account,
    CASE
      WHEN old_account GLOB 'c[0-9]*' THEN printf('c%04d', CAST(substr(old_account, 2) AS INTEGER))
      ELSE NULL
    END AS normalized_account
  FROM legacy_accounts
),
ranked AS (
  SELECT
    old_account,
    normalized_account,
    ROW_NUMBER() OVER (PARTITION BY normalized_account ORDER BY old_account) AS duplicate_rank
  FROM normalized
),
preserved AS (
  SELECT
    old_account,
    CASE
      WHEN normalized_account IS NOT NULL AND duplicate_rank = 1 THEN normalized_account
      ELSE NULL
    END AS preserved_account
  FROM ranked
),
base AS (
  SELECT COALESCE(MAX(CAST(substr(preserved_account, 2) AS INTEGER)), 0) AS max_value
  FROM preserved
),
generated AS (
  SELECT old_account, ROW_NUMBER() OVER (ORDER BY old_account) AS seq
  FROM preserved
  WHERE preserved_account IS NULL
)
INSERT INTO account_code_map_20260320_users_only_management (old_account, new_account)
SELECT
  preserved.old_account,
  COALESCE(preserved.preserved_account, printf('c%04d', (SELECT max_value FROM base) + generated.seq))
FROM preserved
LEFT JOIN generated ON generated.old_account = preserved.old_account;

CREATE TABLE generated_user_accounts_20260320_users_only_management (
  user_id TEXT PRIMARY KEY,
  new_account TEXT NOT NULL UNIQUE
);

WITH base AS (
  SELECT COALESCE(MAX(CAST(substr(new_account, 2) AS INTEGER)), 0) AS max_value
  FROM account_code_map_20260320_users_only_management
),
missing_users AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS seq
  FROM users_legacy_20260320_users_only_management
  WHERE account IS NULL
     OR trim(account) = ''
)
INSERT INTO generated_user_accounts_20260320_users_only_management (user_id, new_account)
SELECT
  id,
  printf('c%04d', (SELECT max_value FROM base) + seq)
FROM missing_users;

CREATE TABLE sender_choice_20260320_users_only_management (
  old_account TEXT PRIMARY KEY,
  sender_email TEXT NOT NULL
);

WITH ranked_senders AS (
  SELECT
    lower(trim(account)) AS old_account,
    lower(trim(sender_email)) AS sender_email,
    ROW_NUMBER() OVER (
      PARTITION BY lower(trim(account))
      ORDER BY enabled DESC, created_at ASC, sender_email ASC
    ) AS row_num
  FROM account_sender_whitelist_legacy_20260320_users_only_management
  WHERE sender_email IS NOT NULL
    AND trim(sender_email) <> ''
)
INSERT INTO sender_choice_20260320_users_only_management (old_account, sender_email)
SELECT old_account, sender_email
FROM ranked_senders
WHERE row_num = 1;

CREATE TABLE users (
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

CREATE INDEX idx_users_role_status
ON users(role, status, member_expires_on, account);

INSERT INTO users (
  id,
  username,
  password_hash,
  role,
  account,
  status,
  member_expires_on,
  created_at,
  updated_at
)
SELECT
  legacy.id,
  CASE
    WHEN legacy.role = 'user' THEN COALESCE(
      sender_choice.sender_email,
      CASE
        WHEN instr(NULLIF(lower(trim(legacy.username)), ''), '@') > 1 THEN NULLIF(lower(trim(legacy.username)), '')
        ELSE NULL
      END,
      printf('legacy-%s@example.invalid', legacy.id)
    )
    ELSE COALESCE(NULLIF(lower(trim(legacy.username)), ''), printf('admin-%s', legacy.id))
  END AS username,
  legacy.password_hash,
  legacy.role,
  COALESCE(account_map.new_account, generated_user_accounts.new_account),
  legacy.status,
  NULL,
  legacy.created_at,
  legacy.updated_at
FROM users_legacy_20260320_users_only_management AS legacy
LEFT JOIN account_code_map_20260320_users_only_management AS account_map
  ON account_map.old_account = lower(trim(legacy.account))
LEFT JOIN generated_user_accounts_20260320_users_only_management AS generated_user_accounts
  ON generated_user_accounts.user_id = legacy.id
LEFT JOIN sender_choice_20260320_users_only_management AS sender_choice
  ON sender_choice.old_account = lower(trim(legacy.account));

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
  FOREIGN KEY(account) REFERENCES users(account)
);

CREATE INDEX idx_expect_snapshots_account_expect
ON expect_snapshots(account, lottery_type, expect DESC);

INSERT INTO expect_snapshots (
  id,
  account,
  lottery_type,
  expect,
  received_at,
  mail_from,
  mail_subject,
  raw_body,
  message_chunks_json,
  created_at,
  updated_at
)
SELECT
  legacy.id,
  account_map.new_account,
  legacy.lottery_type,
  legacy.expect,
  legacy.received_at,
  legacy.mail_from,
  legacy.mail_subject,
  legacy.raw_body,
  legacy.message_chunks_json,
  legacy.created_at,
  legacy.updated_at
FROM expect_snapshots_legacy_20260320_users_only_management AS legacy
LEFT JOIN account_code_map_20260320_users_only_management AS account_map
  ON account_map.old_account = lower(trim(legacy.account));

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX idx_sessions_expires_at
ON sessions(expires_at);

INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
SELECT id, user_id, token_hash, expires_at, created_at
FROM sessions_legacy_20260320_users_only_management;

DROP TABLE generated_user_accounts_20260320_users_only_management;
DROP TABLE sender_choice_20260320_users_only_management;
DROP TABLE account_code_map_20260320_users_only_management;
DROP TABLE sessions_legacy_20260320_users_only_management;
DROP TABLE expect_snapshots_legacy_20260320_users_only_management;
DROP TABLE account_sender_whitelist_legacy_20260320_users_only_management;
DROP TABLE accounts_legacy_20260320_users_only_management;
DROP TABLE users_legacy_20260320_users_only_management;

PRAGMA foreign_keys=on;
