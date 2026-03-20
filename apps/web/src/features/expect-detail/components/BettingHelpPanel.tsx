import { Panel } from "../../../components/Panel";

const HELP_SECTIONS = [
  {
    title: "特码直投",
    description: "未标识玩法的订单默认按“特码直投”处理，生肖转化的号数作为注数。",
    examples: ["01,03,24,34各16米", "1.3.24.34//16斤", "兔狗鸡各数6米", "兔，狗，鸡各号5闷", "兔，狗，鸡各5"]
  },
  {
    title: "平特",
    description: "开奖 7 个号码里包含对应生肖就算中奖；如果多个已投注生肖同时开出，会按多响计算。",
    examples: ["平特兔狗各100", "平特肖兔，狗//50米"]
  },
  {
    title: "平特尾数",
    description: "开奖 7 个号码里出现对应尾数就算中，出现多个尾数按双响、多响计算。",
    examples: ["平特尾8，9各100", "平特尾数8，9//50米", "平特尾8尾，9尾各50斤"]
  }
];

const HELP_MARKERS = ["各数", "各", "各个", "各号", "//", "/", "---", "--", "-", "///"];

export function BettingHelpPanel() {
  return (
    <Panel title="投注帮助">
      <div className="help-panel">
        <p className="help-panel__intro">系统当前支持 3 种玩法，没有特殊玩法前缀时，默认按“特码直投”作为订单。</p>
        <div className="help-panel__section">
          <span className="eyebrow">标准格式</span>
          <p className="help-panel__text">
            玩法+投注内容 + 金额标记 + 单价，例如：<code>01,03,24,34各16米</code>。
          </p>
        </div>
        {HELP_SECTIONS.map((section) => (
          <div className="help-panel__section" key={section.title}>
            <span className="eyebrow">{section.title}</span>
            <p className="help-panel__text">{section.description}</p>
            <ul className="help-panel__list">
              {section.examples.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
        <div className="help-panel__section">
          <span className="eyebrow">金额标记</span>
          <p className="help-panel__text">{HELP_MARKERS.join("、")}</p>
        </div>
      </div>
    </Panel>
  );
}
