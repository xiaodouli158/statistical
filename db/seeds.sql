INSERT INTO accounts (account, inbox, enabled, created_at, updated_at)
VALUES
  ('c001', 'c001@example.com', 1, '2026-03-19T00:00:00.000Z', '2026-03-19T00:00:00.000Z');

INSERT INTO users (id, username, password_hash, role, account, status, created_at, updated_at)
VALUES
  (
    'admin-001',
    'admin',
    'pbkdf2_sha256$100000$vYKJkC07iSQCRhAhaV600g==$SZhnJaD6aR2aSwQHidfAYy7q5gV1SYnTzCZ69WBYwZs=',
    'admin',
    NULL,
    'active',
    '2026-03-19T00:00:00.000Z',
    '2026-03-19T00:00:00.000Z'
  ),
  (
    'user-001',
    'demo',
    'pbkdf2_sha256$100000$W2r7cXX+4V6QVk1dnpxIUg==$MyaZBdKpeIMmTxVgakS14ez9vtGZfBSzDDTzBConAvY=',
    'user',
    'c001',
    'active',
    '2026-03-19T00:00:00.000Z',
    '2026-03-19T00:00:00.000Z'
  );

INSERT INTO expect_snapshots (
  id, account, expect, received_at, mail_from, mail_subject, raw_body, message_chunks_json, created_at, updated_at
)
VALUES (
  'snapshot-001',
  'c001',
  '2026077',
  '2026-03-18T14:05:00.000Z',
  'sender@example.com',
  '2026077期',
  '1、3.24.34各16米\n28，21，4，13//2\n兔，狗，鸡，各数十二。',
  '["1、3.24.34各16米","28，21，4，13//2","兔，狗，鸡，各数十二。"]',
  '2026-03-18T14:05:00.000Z',
  '2026-03-18T14:05:00.000Z'
);

INSERT INTO draw_results (
  expect, open_time, type, open_code, wave, zodiac, verify, source_payload, fetched_at, created_at, updated_at
)
VALUES (
  '2026077',
  '2026-03-18 21:32:32',
  '8',
  '37,32,46,25,39,30,29',
  'blue,green,red,blue,green,red,red',
  '马,猪,鸡,马,龙,牛,虎',
  0,
  '{"expect":"2026077","openTime":"2026-03-18 21:32:32","type":"8","openCode":"37,32,46,25,39,30,29","wave":"blue,green,red,blue,green,red,red","zodiac":"马,猪,鸡,马,龙,牛,虎","verify":false}',
  '2026-03-18T13:32:40.000Z',
  '2026-03-18T13:32:40.000Z',
  '2026-03-18T13:32:40.000Z'
);
