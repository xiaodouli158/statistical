import PostalMime from "postal-mime";
import type { LotteryType } from "@statisticalsystem/shared";
import type { Env } from "../db/types";
import { getActiveMailUserBySender, insertInboundEmail } from "../db/queries";
import { normalizeEmailAddress } from "../utils/strings";
import type { EmailProcessingMessage } from "./types";

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

function resolveLotteryType(env: Env, inbox: string): LotteryType | null {
  const macauInbox = normalizeEmailAddress(env.MACAU_INBOX);
  const hongkongInbox = normalizeEmailAddress(env.HONGKONG_INBOX);

  if (!macauInbox || !hongkongInbox || macauInbox === hongkongInbox) {
    return null;
  }

  if (inbox === macauInbox) {
    return "macau";
  }

  if (inbox === hongkongInbox) {
    return "hongkong";
  }

  return null;
}

export async function handleEmail(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
  const inbox = normalizeEmailAddress(message.to);
  const senderEmail = normalizeEmailAddress(message.from);
  const lotteryType = inbox ? resolveLotteryType(env, inbox) : null;

  if (!lotteryType || !inbox) {
    message.setReject("Unknown inbox");
    return;
  }

  if (!senderEmail) {
    message.setReject("Missing sender");
    return;
  }

  const user = await getActiveMailUserBySender(env, senderEmail);

  if (!user) {
    message.setReject("Sender not allowed");
    return;
  }

  const parsed = await parseMail(message);
  const body = parsed.text.trim();
  const recordId = crypto.randomUUID();
  const receivedAt = new Date().toISOString();

  await insertInboundEmail(env, {
    id: recordId,
    account: user.account,
    lotteryType,
    inbox,
    receivedAt,
    mailFrom: senderEmail,
    mailSubject: parsed.subject,
    rawBody: body
  });

  const queueMessage: EmailProcessingMessage = {
    inboundEmailId: recordId
  };

  await env.EMAIL_PROCESSING_QUEUE.send(queueMessage);
}
