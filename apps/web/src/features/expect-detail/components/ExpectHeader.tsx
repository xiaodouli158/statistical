import { useEffect, useMemo, useState } from "react";
import { BUSINESS_DAY_START_HOUR, HONGKONG_DRAW_WEEKDAYS, LOTTERY_LABELS, type LotteryType } from "@statisticalsystem/shared";
import type { NormalizedDrawResult } from "@statisticalsystem/parser";
import { Panel } from "../../../components/Panel";
import { formatDateTime } from "../../../utils/format";

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DRAW_OPEN_HOUR = 21;
const DRAW_OPEN_MINUTE = 30;

type ExpectHeaderProps = {
  lotteryType: LotteryType;
  expect: string;
  receivedAt: string;
  drawResult: NormalizedDrawResult | null;
};

function getShanghaiBusinessDateStart(receivedAtMs: number): number {
  const shanghaiDate = new Date(receivedAtMs + SHANGHAI_OFFSET_MS);
  const shanghaiMidnightUtc =
    Date.UTC(shanghaiDate.getUTCFullYear(), shanghaiDate.getUTCMonth(), shanghaiDate.getUTCDate(), 0, 0, 0, 0) - SHANGHAI_OFFSET_MS;

  return shanghaiDate.getUTCHours() < BUSINESS_DAY_START_HOUR ? shanghaiMidnightUtc - ONE_DAY_MS : shanghaiMidnightUtc;
}

function isHongkongDrawDate(dateStartMs: number): boolean {
  const shanghaiDate = new Date(dateStartMs + SHANGHAI_OFFSET_MS);
  return HONGKONG_DRAW_WEEKDAYS.includes(shanghaiDate.getUTCDay() as (typeof HONGKONG_DRAW_WEEKDAYS)[number]);
}

function getDrawDateStart(lotteryType: LotteryType, receivedAtMs: number): number {
  if (lotteryType === "macau") {
    return getShanghaiBusinessDateStart(receivedAtMs);
  }

  let cursor = getShanghaiBusinessDateStart(receivedAtMs);

  while (!isHongkongDrawDate(cursor)) {
    cursor += ONE_DAY_MS;
  }

  return cursor;
}

function getDrawOpenTimestamp(lotteryType: LotteryType, receivedAt: string): number | null {
  const receivedAtMs = Date.parse(receivedAt);

  if (Number.isNaN(receivedAtMs)) {
    return null;
  }

  return getDrawDateStart(lotteryType, receivedAtMs) + (DRAW_OPEN_HOUR * 60 + DRAW_OPEN_MINUTE) * 60 * 1000;
}

function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function ExpectHeader({ lotteryType, expect, receivedAt, drawResult }: ExpectHeaderProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const drawOpenTimestamp = useMemo(() => getDrawOpenTimestamp(lotteryType, receivedAt), [lotteryType, receivedAt]);
  const drawTimeText = useMemo(() => {
    if (drawResult) {
      return formatDateTime(drawResult.openTime);
    }

    if (drawOpenTimestamp === null) {
      return "待开奖";
    }

    if (nowMs < drawOpenTimestamp) {
      return `距开奖 ${formatCountdown(drawOpenTimestamp - nowMs)}`;
    }

    return "开奖中";
  }, [drawOpenTimestamp, drawResult, nowMs]);

  useEffect(() => {
    if (drawResult || drawOpenTimestamp === null) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [drawOpenTimestamp, drawResult]);

  return (
    <Panel title={`${LOTTERY_LABELS[lotteryType]} ${expect}期`}>
      <div className="expect-header-panel">
        <div className="expect-header-meta">
          <div className="expect-header-meta__item">
            <span className="eyebrow">邮件快照时间</span>
            <strong>{formatDateTime(receivedAt)}</strong>
          </div>
          <div className="expect-header-meta__item">
            <span className="eyebrow">开奖时间</span>
            <strong>{drawTimeText}</strong>
          </div>
        </div>

        {drawResult ? (
          <div className="draw-strip-wrap">
            <div className="draw-strip">
              {drawResult.numbers.map((number, index) => {
                const isSpecial = index === drawResult.numbers.length - 1;

                return (
                  <div className="draw-ball-stack" key={`${number}-${index}`}>
                    {isSpecial ? <span className="draw-ball__tag">特码</span> : null}
                    <div
                      className={`draw-ball draw-ball--${drawResult.waves[index] ?? "blue"}${isSpecial ? " draw-ball--special" : ""}`}
                    >
                      <span className="draw-ball__number">{number}</span>
                      <span className="draw-ball__meta">{drawResult.zodiacs[index] ?? "-"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="muted">当前还没有开奖号码，订单和图表会先按下注内容展示。</p>
        )}
      </div>
    </Panel>
  );
}
