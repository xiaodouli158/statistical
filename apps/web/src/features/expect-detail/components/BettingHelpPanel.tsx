import {
  DOMESTIC_ZODIACS,
  NUMBER_ORDER_NATURAL,
  WILD_ZODIACS,
  getNumbersForParityCategory,
  getNumbersForSizeCategory,
  getNumbersForWaveColor,
  getNumbersForZodiacGroup
} from "@statisticalsystem/shared";
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

type ReferenceCard = {
  title: string;
  lines: string[];
};

type TableRow = {
  label: string;
  values: Array<number | null>;
};

const FIVE_ELEMENT_GROUPS = [
  { label: "金", values: ["03", "04", "11", "12", "25", "26", "33", "34", "41", "42"] },
  { label: "木", values: ["07", "08", "15", "16", "23", "24", "37", "38", "45", "46"] },
  { label: "水", values: ["13", "14", "21", "22", "29", "30", "43", "44"] },
  { label: "火", values: ["01", "02", "09", "10", "17", "18", "31", "32", "39", "40", "47", "48"] },
  { label: "土", values: ["05", "06", "19", "20", "27", "28", "35", "36", "49"] }
] as const;

const MULTIPLE_TARGETS = [2, 3, 4, 5, 6, 7] as const;
const MULTIPLE_ROW_COUNTS = Array.from({ length: 19 }, (_, index) => index + 2);
const DRAG_BANKER_COUNTS = [1, 2, 3, 4, 5, 6] as const;
const DRAG_TRAILER_COUNTS = Array.from({ length: 12 }, (_, index) => index + 1);

const STANDARD_FORMAT_EXAMPLE: ExampleSegment[] = [
  { text: "01,03,24,34" },
  { text: "各", tone: "marker" },
  { text: "16" }
];

const HELP_SECTIONS: HelpSection[] = [
  {
    title: "特码直投",
    description:
      "未标识玩法的订单默认按“特码直投”处理，生肖会自动换算成对应号码参与统计。组合条件支持波色、大小单双、家肖/野肖，也支持生肖和这些条件做交集；同类条件取并集，不同类条件取交集。生肖下注必须使用“各数”或“各号”，否则按未识别处理。",
    examples: [
      [{ text: "03" }, { text: "各", tone: "marker" }, { text: "16" }],
      [{ text: "01.03.24.34" }, { text: "各数", tone: "marker" }, { text: "16米" }],
      [{ text: "兔狗鸡" }, { text: "各数", tone: "marker" }, { text: "12" }],
      [{ text: "兔，狗，鸡" }, { text: "各号", tone: "marker" }, { text: "10" }],
      [{ text: "兔龙大" }, { text: "各数", tone: "marker" }, { text: "6" }],
      [{ text: "红单" }, { text: "各数", tone: "marker" }, { text: "6米" }],
      [{ text: "红绿波小" }, { text: "各数", tone: "marker" }, { text: "6" }],
      [{ text: "家肖大" }, { text: "各数", tone: "marker" }, { text: "6块" }],
      [{ text: "野兽双数" }, { text: "各号", tone: "marker" }, { text: "6元" }]
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

function formatLocalDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function orderNumbers(values: string[]): string[] {
  const valueSet = new Set(values);
  return NUMBER_ORDER_NATURAL.filter((value) => valueSet.has(value));
}

function combination(count: number, pick: number): number {
  if (pick < 0 || pick > count) {
    return 0;
  }

  const normalizedPick = Math.min(pick, count - pick);
  let total = 1;

  for (let index = 1; index <= normalizedPick; index += 1) {
    total = (total * (count - normalizedPick + index)) / index;
  }

  return Math.round(total);
}

function buildReferenceCards(referenceDate: string): ReferenceCard[] {
  const homeNumbers = orderNumbers(getNumbersForZodiacGroup("家肖", referenceDate));
  const wildNumbers = orderNumbers(getNumbersForZodiacGroup("野肖", referenceDate));
  const bigNumbers = getNumbersForSizeCategory("大");
  const smallNumbers = getNumbersForSizeCategory("小");
  const oddNumbers = getNumbersForParityCategory("单");
  const evenNumbers = getNumbersForParityCategory("双");

  return [
    {
      title: `家肖（${homeNumbers.length}个）`,
      lines: [`生肖：${DOMESTIC_ZODIACS.join("、")}`, `号码：${homeNumbers.join(",")}`]
    },
    {
      title: `野肖（${wildNumbers.length}个）`,
      lines: [`生肖：${WILD_ZODIACS.join("、")}`, `号码：${wildNumbers.join(",")}`]
    },
    {
      title: `红波（${getNumbersForWaveColor("red").length}个）`,
      lines: [getNumbersForWaveColor("red").join(",")]
    },
    {
      title: `蓝波（${getNumbersForWaveColor("blue").length}个）`,
      lines: [getNumbersForWaveColor("blue").join(",")]
    },
    {
      title: `绿波（${getNumbersForWaveColor("green").length}个）`,
      lines: [getNumbersForWaveColor("green").join(",")]
    },
    {
      title: `大数（${bigNumbers.length}个）`,
      lines: [bigNumbers.join(",")]
    },
    {
      title: `小数（${smallNumbers.length}个）`,
      lines: [smallNumbers.join(",")]
    },
    {
      title: `单数（${oddNumbers.length}个）`,
      lines: [oddNumbers.join(",")]
    },
    {
      title: `双数（${evenNumbers.length}个）`,
      lines: [evenNumbers.join(",")]
    },
    ...FIVE_ELEMENT_GROUPS.map((group) => ({
      title: `${group.label}（${group.values.length}个）`,
      lines: [group.values.join(",")]
    }))
  ];
}

function buildMultipleRows(): TableRow[] {
  return MULTIPLE_ROW_COUNTS.map((count) => ({
    label: String(count),
    values: MULTIPLE_TARGETS.map((target) => (count >= target ? combination(count, target) : null))
  }));
}

function buildDragRows(bankers: number): TableRow[] {
  return DRAG_TRAILER_COUNTS.map((trailers) => ({
    label: String(trailers),
    values: MULTIPLE_TARGETS.map((target) => {
      const picksNeeded = target - bankers;

      if (picksNeeded <= 0 || trailers < picksNeeded) {
        return null;
      }

      return combination(trailers, picksNeeded);
    })
  })).filter((row) => row.values.some((value) => value !== null));
}

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

function renderTable(firstColumnLabel: string, headers: string[], rows: TableRow[]) {
  return (
    <div className="help-panel__table-wrap">
      <table className="help-panel__table">
        <thead>
          <tr>
            <th>{firstColumnLabel}</th>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th>{row.label}</th>
              {row.values.map((value, index) => (
                <td key={`${row.label}-${headers[index]}`}>{value ?? "-"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BettingHelpPanel() {
  const referenceDate = formatLocalDate();
  const referenceCards = buildReferenceCards(referenceDate);
  const multipleRows = buildMultipleRows();

  return (
    <Panel title="投注帮助">
      <div className="help-panel">
        <p className="help-panel__intro">系统当前支持 3 种玩法，没有特殊玩法前缀时，默认按“特码直投”作为订单处理。</p>

        <div className="help-panel__section">
          <span className="eyebrow">标准格式</span>
          <p className="help-panel__text">玩法 + 投注内容 + 金额标记（各、各数） + 单价，例如：</p>
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
          <p className="help-panel__text">组合别名：“野兽”按“野肖”处理，“家畜”按“家肖”处理。</p>
        </div>

        <div className="help-panel__section">
          <span className="eyebrow">对照表</span>
          <p className="help-panel__note">家肖、野肖号码会按当前年份自动换算。当前帮助页口径日期：{referenceDate}。</p>
          <div className="help-panel__reference-grid">
            {referenceCards.map((card) => (
              <article className="help-panel__reference-card" key={card.title}>
                <h4 className="help-panel__subheading">{card.title}</h4>
                {card.lines.map((line, index) => (
                  <p className="help-panel__reference-line" key={`${card.title}-${index}`}>
                    {line}
                  </p>
                ))}
              </article>
            ))}
          </div>
        </div>

        <div className="help-panel__section">
          <span className="eyebrow">复式参照表</span>
          <p className="help-panel__note">表头为复式二到复式七，行是号码个数，单元格显示对应的组数。</p>
          {renderTable(
            "个数",
            MULTIPLE_TARGETS.map((target) => `复式${target}`),
            multipleRows
          )}
        </div>

        <div className="help-panel__section">
          <span className="eyebrow">拖式参照表</span>
          <p className="help-panel__note">组数按 C（拖码个数，目标个数 - 胆码个数）计算，下面按不同胆码个数展示二组到七组的对应组数。</p>
          <div className="help-panel__drag-grid">
            {DRAG_BANKER_COUNTS.map((bankers) => (
              <div className="help-panel__table-section" key={bankers}>
                <h4 className="help-panel__subheading">{bankers}胆</h4>
                {renderTable(
                  "拖码个数",
                  MULTIPLE_TARGETS.map((target) => `${target}组`),
                  buildDragRows(bankers)
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
