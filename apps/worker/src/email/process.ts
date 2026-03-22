import type { Env } from "../db/types";
import {
  getInboundEmailById,
  insertMailRecord,
  markInboundEmailAttempt,
  markInboundEmailFailed,
  markInboundEmailProcessed,
  refreshExpectComputeCacheForAccount,
  upsertSnapshot
} from "../db/queries";
import { cleanMailBody } from "./clean";
import { detectExpect } from "./detect-expect";
import type { EmailProcessingMessage } from "./types";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function processInboundEmail(env: Env, inboundEmailId: string): Promise<void> {
  const inboundEmail = await getInboundEmailById(env, inboundEmailId);

  if (!inboundEmail || inboundEmail.processing_status === "processed") {
    return;
  }

  await markInboundEmailAttempt(env, inboundEmailId);

  try {
    const expect = detectExpect(
      inboundEmail.mail_subject,
      inboundEmail.raw_body,
      new Date(inboundEmail.received_at),
      inboundEmail.lottery_type
    );
    const messageChunks = cleanMailBody(inboundEmail.raw_body);
    const recordId = inboundEmail.id;

    await insertMailRecord(env, {
      id: recordId,
      account: inboundEmail.account,
      lotteryType: inboundEmail.lottery_type,
      expect,
      receivedAt: inboundEmail.received_at,
      mailFrom: inboundEmail.mail_from,
      mailSubject: inboundEmail.mail_subject,
      rawBody: inboundEmail.raw_body,
      messageChunks
    });

    await upsertSnapshot(env, {
      id: recordId,
      account: inboundEmail.account,
      lotteryType: inboundEmail.lottery_type,
      expect,
      receivedAt: inboundEmail.received_at,
      mailFrom: inboundEmail.mail_from,
      mailSubject: inboundEmail.mail_subject,
      rawBody: inboundEmail.raw_body,
      messageChunks
    });

    await refreshExpectComputeCacheForAccount(env, inboundEmail.account, inboundEmail.lottery_type, expect);

    await markInboundEmailProcessed(env, {
      id: inboundEmailId,
      expect,
      messageChunks,
      processedRecordId: recordId
    });
  } catch (error) {
    const errorMessage = toErrorMessage(error);

    await markInboundEmailFailed(env, inboundEmailId, errorMessage);
    throw error;
  }
}

export async function handleEmailProcessingQueue(batch: MessageBatch<EmailProcessingMessage>, env: Env): Promise<void> {
  for (const message of batch.messages) {
    const inboundEmailId = message.body?.inboundEmailId;

    if (!inboundEmailId) {
      message.ack();
      continue;
    }

    try {
      await processInboundEmail(env, inboundEmailId);
      message.ack();
    } catch (error) {
      console.error("processInboundEmail failed", {
        inboundEmailId,
        error
      });
      message.retry();
    }
  }
}
