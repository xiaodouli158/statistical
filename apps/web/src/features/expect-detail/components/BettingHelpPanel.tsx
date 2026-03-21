import { Panel } from "../../../components/Panel";

type ExampleTone = "playType" | "marker";

type ExampleSegment = {
  text: string;
  tone?: ExampleTone;
};

type HelpSection = {
  title: string;
  description: string;
  examples: ExampleSegment[][];
};

const STANDARD_FORMAT_EXAMPLE: ExampleSegment[] = [
  { text: "01,03,24,34" },
  { text: "各", tone: "marker" },
  { text: "16" }
];

const HELP_SECTIONS: HelpSection[] = [
  {
    title: "特码直投",
    description: "未标识玩法的订单默认按“特码直投”处理，生肖会自动换算成对应号码参与统计。生肖下注必须使用“各数”或“各号”，否则按未识别处理。",
    examples: [
      [{ text: "01,03,24,34" }, { text: "各", tone: "marker" }, { text: "16" }],
      [{ text: "01,03,24,34" }, { text: "各数", tone: "marker" }, { text: "16米" }],
      [{ text: "1.3.24.34" }, { text: "//", tone: "marker" }, { text: "10块" }],
      [{ text: "兔狗鸡" }, { text: "各数", tone: "marker" }, { text: "12" }],
      [{ text: "兔，狗，鸡" }, { text: "各号", tone: "marker" }, { text: "10" }]
    ]
  },
  {
    title: "平特",
    description: "开奖 7 个号码里只要包含对应生肖就算中奖；如果多个已下注生肖同时开出，会按多响计算。",
    examples: [
      [{ text: "平特", tone: "playType" }, { text: "兔狗" }, { text: "各", tone: "marker" }, { text: "100" }],
      [{ text: "平特肖", tone: "playType" }, { text: "兔，狗" }, { text: "//", tone: "marker" }, { text: "50" }]
    ]
  },
  {
    title: "平特尾数",
    description: "开奖 7 个号码里只要出现对应尾数就算中奖，出现多个尾数时按双响、多响计算。",
    examples: [
      [{ text: "平特尾", tone: "playType" }, { text: "8.9" }, { text: "各", tone: "marker" }, { text: "100" }],
      [{ text: "平特尾数", tone: "playType" }, { text: "8，9" }, { text: "//", tone: "marker" }, { text: "50" }]
    ]
  }
];

const NUMBER_HELP_MARKERS = ["各数", "各", "各个", "各号", "/", "//..."];
const ZODIAC_HELP_MARKERS = ["各数", "各号"];

function renderExample(example: ExampleSegment[]) {
  return (
    <span className="help-panel__example">
      {example.map((segment, index) => {
        const className =
          segment.tone === "playType"
            ? "help-panel__segment help-panel__segment--play-type"
            : segment.tone === "marker"
              ? "help-panel__segment help-panel__segment--marker"
              : "help-panel__segment";

        return (
          <span className={className} key={`${segment.text}-${index}`}>
            {segment.text}
          </span>
        );
      })}
    </span>
  );
}

export function BettingHelpPanel() {
  return (
    <Panel title="投注帮助">
      <div className="help-panel">
        <p className="help-panel__intro">系统当前支持 3 种玩法，没有特殊玩法前缀时，默认按“特码直投”作为订单处理。</p>
        <div className="help-panel__section">
          <span className="eyebrow">标准格式</span>
          <p className="help-panel__text">玩法 + 投注内容 + 金额标记 + 单价，例如：</p>
          {renderExample(STANDARD_FORMAT_EXAMPLE)}
        </div>
        {HELP_SECTIONS.map((section) => (
          <div className="help-panel__section" key={section.title}>
            <span className="eyebrow">{section.title}</span>
            <p className="help-panel__text">{section.description}</p>
            <ul className="help-panel__list">
              {section.examples.map((example, index) => (
                <li key={`${section.title}-${index}`}>{renderExample(example)}</li>
              ))}
            </ul>
          </div>
        ))}
        <div className="help-panel__section">
          <span className="eyebrow">金额标记</span>
          <p className="help-panel__text">号码直投支持：{NUMBER_HELP_MARKERS.join("、")}。</p>
          <p className="help-panel__text">生肖直投仅支持：{ZODIAC_HELP_MARKERS.join("、")}。</p>
        </div>
      </div>
    </Panel>
  );
}
