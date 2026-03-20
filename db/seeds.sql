INSERT INTO users (id, username, password_hash, role, account, status, member_expires_on, created_at, updated_at)
VALUES
  (
    'admin-001',
    'admin',
    'pbkdf2_sha256$100000$vYKJkC07iSQCRhAhaV600g==$SZhnJaD6aR2aSwQHidfAYy7q5gV1SYnTzCZ69WBYwZs=',
    'admin',
    'c0001',
    'active',
    NULL,
    '2026-03-19T00:00:00.000Z',
    '2026-03-19T00:00:00.000Z'
  ),
  (
    'user-001',
    'sender@example.com',
    'pbkdf2_sha256$100000$W2r7cXX+4V6QVk1dnpxIUg==$MyaZBdKpeIMmTxVgakS14ez9vtGZfBSzDDTzBConAvY=',
    'user',
    'c0002',
    'active',
    '2099-12-31',
    '2026-03-19T00:00:00.000Z',
    '2026-03-19T00:00:00.000Z'
  );

INSERT INTO expect_snapshots (
  id, account, lottery_type, expect, received_at, mail_from, mail_subject, raw_body, message_chunks_json, created_at, updated_at
)
VALUES (
  'snapshot-001',
  'c0002',
  'macau',
  '2026077',
  '2026-03-18T14:05:00.000Z',
  'sender@example.com',
  '2026077 sample',
  '1. 24,34 合 36 类\n28 合 31 类 3/2\n兔，狗，鸡，各数十二。',
  '["1. 24,34 合 36 类","28 合 31 类 3/2","兔，狗，鸡，各数十二。"]',
  '2026-03-18T14:05:00.000Z',
  '2026-03-18T14:05:00.000Z'
);

INSERT INTO draw_results (
  lottery_type, expect, open_time, type, open_code, wave, zodiac, verify, source_payload, fetched_at, created_at, updated_at
)
VALUES (
  'macau',
  '2026077',
  '2026-03-18 21:32:32',
  '8',
  '37,32,46,25,39,30,29',
  'blue,green,red,blue,green,red,red',
  '马,猴,鸡,马,龙,蛇,虎',
  0,
  '{"expect":"2026077","openTime":"2026-03-18 21:32:32","type":"8","openCode":"37,32,46,25,39,30,29","wave":"blue,green,red,blue,green,red,red","zodiac":"马,猴,鸡,马,龙,蛇,虎","verify":false}',
  '2026-03-18T13:32:40.000Z',
  '2026-03-18T13:32:40.000Z',
  '2026-03-18T13:32:40.000Z'
);
