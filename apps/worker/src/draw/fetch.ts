import {
  DRAW_API_BACKUP_URL,
  DRAW_API_PRIMARY_URL,
  LOTTERY_API_KEYS,
  type DrawResultRecord,
  type LotteryType
} from "@statisticalsystem/shared";
import { normalizeZodiacName } from "@statisticalsystem/parser";
import { upsertDrawResult } from "../db/queries";
import type { Env } from "../db/types";
import { formatNowIso, getActiveLotteries, getBeijingWindowStatus, isCurrentDrawResult } from "../utils/time";

type DrawApiItem = {
  expect: string;
  openTime: string;
  type: string;
  openCode: string;
  wave: string;
  zodiac: string;
  verify: boolean;
};

type DrawApiPayload = Partial<Record<string, DrawApiItem>>;

function isValidExpect(expect: string): boolean {
  return /^\d+$/.test(expect.trim());
}

function isCompleteOpenCode(openCode: string): boolean {
  const numbers = openCode
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (numbers.length !== 7) {
    return false;
  }

  return numbers.every((value) => /^(?:0?[1-9]|[1-3][0-9]|4[0-9])$/.test(value));
}

function normalizeDrawItem(lotteryType: LotteryType, item: DrawApiItem): DrawResultRecord {
  return {
    lotteryType,
    expect: item.expect,
    openTime: item.openTime,
    type: item.type,
    openCode: item.openCode,
    wave: item.wave,
    zodiac: item.zodiac
      .split(",")
      .map((value) => normalizeZodiacName(value) ?? value.trim())
      .join(","),
    verify: item.verify
  };
}

function pickLotteryDraw(payload: DrawApiPayload, lotteryType: LotteryType): DrawResultRecord | null {
  const apiKey = LOTTERY_API_KEYS[lotteryType];
  const item = payload[apiKey];

  if (!item) {
    console.warn(`draw payload missing required lottery key: ${apiKey}`);
    return null;
  }

  if (!isValidExpect(item.expect)) {
    console.warn(`draw payload has invalid expect for ${apiKey}: ${item.expect}`);
    return null;
  }

  if (!isCompleteOpenCode(item.openCode)) {
    console.warn(`draw payload has incomplete openCode for ${apiKey}: ${item.openCode}`);
    return null;
  }

  return normalizeDrawItem(lotteryType, item);
}

async function fetchDrawPayload(url: string): Promise<{ payload: string; parsed: DrawApiPayload }> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch draw data: ${response.status}`);
  }

  const payload = await response.text();
  return {
    payload,
    parsed: JSON.parse(payload) as DrawApiPayload
  };
}

async function fetchLatestDraws(env: Env): Promise<{ payload: string; draws: Partial<Record<LotteryType, DrawResultRecord>> }> {
  const urls = [env.DRAW_API_PRIMARY_URL ?? DRAW_API_PRIMARY_URL, env.DRAW_API_BACKUP_URL ?? DRAW_API_BACKUP_URL];
  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      const { payload, parsed } = await fetchDrawPayload(url);

      return {
        payload,
        draws: {
          macau: pickLotteryDraw(parsed, "macau") ?? undefined,
          hongkong: pickLotteryDraw(parsed, "hongkong") ?? undefined
        }
      };
    } catch (error) {
      lastError = error as Error;
    }
  }

  throw lastError ?? new Error("Failed to fetch draw data");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function syncDrawsOnce(
  env: Env,
  lotteries: LotteryType[],
  targetExpects: Partial<Record<LotteryType, string>> = {}
): Promise<Partial<Record<LotteryType, DrawResultRecord>>> {
  const { payload, draws } = await fetchLatestDraws(env);
  const result: Partial<Record<LotteryType, DrawResultRecord>> = {};

  for (const lotteryType of lotteries) {
    const draw = draws[lotteryType];

    if (!draw) {
      continue;
    }

    const targetExpect = targetExpects[lotteryType];
    const shouldSave = targetExpect ? draw.expect === targetExpect : isCurrentDrawResult(lotteryType, draw.openTime);

    if (!shouldSave) {
      continue;
    }

    await upsertDrawResult(env, {
      ...draw,
      sourcePayload: payload,
      fetchedAt: formatNowIso()
    });

    result[lotteryType] = draw;
  }

  return result;
}

export async function syncDrawOnce(env: Env, lotteryType: LotteryType, targetExpect?: string): Promise<DrawResultRecord | null> {
  const result = await syncDrawsOnce(env, [lotteryType], targetExpect ? { [lotteryType]: targetExpect } : {});
  return result[lotteryType] ?? null;
}

export async function pollDrawUntilSaved(env: Env): Promise<void> {
  const windowStatus = getBeijingWindowStatus();

  if (windowStatus === "before" || windowStatus === "after") {
    return;
  }

  const pending = new Set<LotteryType>(getActiveLotteries());
  const deadline = Date.now() + 10 * 60 * 1000;

  while (Date.now() < deadline && pending.size > 0) {
    try {
      const saved = await syncDrawsOnce(env, Array.from(pending));

      for (const lotteryType of Object.keys(saved) as LotteryType[]) {
        pending.delete(lotteryType);
      }
    } catch (error) {
      console.error("pollDrawUntilSaved fetch failed", error);
    }

    if (pending.size === 0) {
      return;
    }

    await sleep(10_000);
  }
}
