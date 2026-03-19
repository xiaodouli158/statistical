import type { NormalizedDrawResult } from "@statisticalsystem/parser";
import { Panel } from "../../../components/Panel";
import { formatDateTime } from "../../../utils/format";

type ExpectHeaderProps = {
  expect: string;
  receivedAt: string;
  drawResult: NormalizedDrawResult | null;
};

export function ExpectHeader({ expect, receivedAt, drawResult }: ExpectHeaderProps) {
  return (
    <Panel title={`${expect}期`}>
      <div className="expect-header">
        <div>
          <span className="eyebrow">邮件快照时间</span>
          <strong>{formatDateTime(receivedAt)}</strong>
        </div>
        <div>
          <span className="eyebrow">开奖时间</span>
          <strong>{drawResult ? drawResult.openTime : "待开奖"}</strong>
        </div>
      </div>

      {drawResult ? (
        <div className="draw-strip">
          {drawResult.numbers.map((number, index) => (
            <div className={`draw-ball draw-ball--${drawResult.waves[index] ?? "blue"}`} key={`${number}-${index}`}>
              <span className="draw-ball__number">{number}</span>
              <span className="draw-ball__meta">{drawResult.zodiacs[index] ?? "-"}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">当前尚无开奖号，订单与图表会先按下注内容展示。</p>
      )}
    </Panel>
  );
}
