import { DRAW_API_URL } from "@statisticalsystem/shared";
import type { DrawResultRecord } from "@statisticalsystem/shared";
import type { Env } from "../db/types";
import { upsertDrawResult } from "../db/queries";
import { computeExpectForDraw, formatNowIso, getBeijingWindowStatus } from "../utils/time";
import { normalizeZodiacName } from "@statisticalsystem/parser";

type DrawApiItem = {
  expect: string;
  openTime: string;
  type: string;
  openCode: string;
  wave: string;
  zodiac: string;
  verify: boolean;
};

function normalizeDrawItem(item: DrawApiItem): DrawResultRecord {
  return {
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

async function fetchLatestDraw(env: Env): Promise<{ latest: DrawResultRecord | null; payload: string }> {
  const response = await fetch(env.DRAW_API_URL ?? DRAW_API_URL, {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch draw data: ${response.status}`);
  }

  const payload = await response.text();
  const parsed = JSON.parse(payload) as DrawApiItem[];
  const latest = parsed.at(0);

  return {
    latest: latest ? normalizeDrawItem(latest) : null,
    payload
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function syncDrawOnce(env: Env, targetExpect = computeExpectForDraw()): Promise<DrawResultRecord | null> {
  const { latest, payload } = await fetchLatestDraw(env);

  if (!latest || latest.expect !== targetExpect) {
    return null;
  }

  await upsertDrawResult(env, {
    ...latest,
    sourcePayload: payload,
    fetchedAt: formatNowIso()
  });

  return latest;
}

export async function pollDrawUntilSaved(env: Env): Promise<void> {
  const windowStatus = getBeijingWindowStatus();

  if (windowStatus === "before" || windowStatus === "after") {
    return;
  }

  const targetExpect = computeExpectForDraw();
  const deadline = Date.now() + 9 * 60 * 1000;

  while (Date.now() < deadline) {
    let draw: DrawResultRecord | null = null;

    try {
      draw = await syncDrawOnce(env, targetExpect);
    } catch (error) {
      console.error("pollDrawUntilSaved fetch failed", error);
    }

    if (draw) {
      return;
    }

    await sleep(10_000);
  }
}
