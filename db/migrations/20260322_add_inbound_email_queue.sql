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
