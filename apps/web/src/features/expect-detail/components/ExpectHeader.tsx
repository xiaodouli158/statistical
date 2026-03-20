import { LOTTERY_LABELS, type LotteryType } from "@statisticalsystem/shared";
import type { NormalizedDrawResult } from "@statisticalsystem/parser";
import { Panel } from "../../../components/Panel";
import { formatDateTime } from "../../../utils/format";

type ExpectHeaderProps = {
  lotteryType: LotteryType;
  expect: string;
  receivedAt: string;
  drawResult: NormalizedDrawResult | null;
};

export function ExpectHeader({ lotteryType, expect, receivedAt, drawResult }: ExpectHeaderProps) {
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
            <strong>{drawResult ? drawResult.openTime : "待开奖"}</strong>
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
          <p className="muted">当前尚无开奖号，订单与图表会先按下注内容展示。</p>
        )}
      </div>
    </Panel>
  );
}
