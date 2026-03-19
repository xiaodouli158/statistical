import PostalMime from "postal-mime";
import type { Env } from "../db/types";
import { getAccountByInbox, upsertSnapshot } from "../db/queries";
import { cleanMailBody } from "./clean";
import { detectExpect } from "./detect-expect";

type ParsedMail = {
  subject: string | null;
  text: string;
};

async function parseMail(message: ForwardableEmailMessage): Promise<ParsedMail> {
  const parser = new PostalMime();
  const parsed = await parser.parse(message.raw);

  return {
    subject: parsed.subject ?? null,
    text: parsed.text ?? ""
  };
}

export async function handleEmail(message: ForwardableEmailMessage, env: Env): Promise<void> {
  const inbox = message.to.toLowerCase();
  const account = await getAccountByInbox(env, inbox);

  if (!account || !account.enabled) {
    message.setReject("Unknown or disabled inbox");
    return;
  }

  const parsed = await parseMail(message);
  const body = parsed.text.trim();
  const receivedAt = new Date();
  const messageChunks = cleanMailBody(body);
  const expect = detectExpect(parsed.subject, body, receivedAt);

  await upsertSnapshot(env, {
    account: account.account,
    expect,
    receivedAt: receivedAt.toISOString(),
    mailFrom: message.from,
    mailSubject: parsed.subject,
    rawBody: body,
    messageChunks
  });
}
