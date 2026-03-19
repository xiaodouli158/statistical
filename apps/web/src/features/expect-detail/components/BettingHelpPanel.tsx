import { Panel } from "../../../components/Panel";

const HELP_SECTIONS = [
  {
    title: "特码直投",
    description: "未特殊标识的订单默认按“特码直投”处理，生肖会自动映射成号码，结算时只看最后一个开奖号码。",
    examples: ["01,03,24,34各16米", "1.3.24.34//16斤", "兔狗鸡各数6米", "兔，狗，鸡各数5元", "兔，狗，鸡-5"]
  },
  {
    title: "平特",
    description: "不会转成号码，开奖 7 个号码里包含对应生肖就算中奖；如果多个已投注生肖同时开出，会按双响、多响计算。",
    examples: ["平特兔狗各100", "平特肖兔，狗//50米"]
  },
  {
    title: "平特尾数",
    description: "开奖 7 个号码里出现对应尾数就算中，出现多个尾数按双响、多响计算。",
    examples: ["平特尾8尾，9尾各100", "平特尾数8，9//50米", "平特尾8，9各数50斤"]
  }
];

const HELP_MARKERS = ["各数", "各", "各个", "各号", "//", "/", "---", "--", "-", "///"];

export function BettingHelpPanel() {
  return (
    <Panel title="投注帮助">
      <div className="help-panel">
        <p className="help-panel__intro">系统当前支持 3 种玩法，赔率由环境变量控制；没有特殊玩法前缀时，默认按“特码直投”解析。</p>
        <div className="help-panel__section">
          <span className="eyebrow">标准格式</span>
          <p className="help-panel__text">
            投注内容 + 金额标记 + 单价，例如：<code>01,03,24,34各16米</code>。
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
