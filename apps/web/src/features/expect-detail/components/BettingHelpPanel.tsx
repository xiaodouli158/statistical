import { Panel } from "../../../components/Panel";

const HELP_EXAMPLES = [
  "号码直投：01,03,24,34各16米",
  "点号混写：1.3.24.34//16斤",
  "生肖直投：兔，狗，鸡各数5元",
  "简写生肖：兔，狗，鸡-5"
];

const HELP_MARKERS = ["各数", "各", "//", "/", "---", "--", "-", "///"];

export function BettingHelpPanel() {
  return (
    <Panel title="投注帮助">
      <div className="help-panel">
        <p className="help-panel__intro">当前页面默认按“特码直投”解析订单，结算时只使用开奖号最后一个号码作为特码。</p>
        <div className="help-panel__section">
          <span className="eyebrow">标准格式</span>
          <p className="help-panel__text">
            投注内容 + 金额标记 + 单价，例如：<code>01,03,24,34各16米</code>。
          </p>
        </div>
        <div className="help-panel__section">
          <span className="eyebrow">支持格式</span>
          <ul className="help-panel__list">
            {HELP_EXAMPLES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="help-panel__section">
          <span className="eyebrow">金额标记</span>
          <p className="help-panel__text">{HELP_MARKERS.join("、")}</p>
        </div>
      </div>
    </Panel>
  );
}
