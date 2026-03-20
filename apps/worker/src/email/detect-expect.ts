import type { LotteryType } from "@statisticalsystem/shared";
import { computeExpectForMail } from "../utils/time";

const EXPECT_PATTERN = /\b(20\d{5})\b/;

export function detectExpect(subject: string | null, body: string, receivedAt: Date, lotteryType: LotteryType): string {
  const subjectMatch = subject?.match(EXPECT_PATTERN)?.[1];

  if (subjectMatch) {
    return subjectMatch;
  }

  const bodyMatch = body.match(EXPECT_PATTERN)?.[1];

  if (bodyMatch) {
    return bodyMatch;
  }

  return computeExpectForMail(receivedAt, lotteryType);
}
