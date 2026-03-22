import {
  BASE_ELEMENT_NUMBER_MAP,
  DOMESTIC_ZODIACS,
  WILD_ZODIACS,
  getNumbersForElement,
  getNumbersForWaveColor
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
  label: string;
  value: string;
};

type TableRow = {
  label: string;
  values: Array<number | null>;
};

const MULTIPLE_TARGETS = [2, 3, 4, 5, 6] as const;
const MULTIPLE_ROW_COUNTS = Array.from({ length: 13 }, (_, index) => index + 3);
const DRAG_BANKER_COUNTS = [2, 3, 4, 5, 6] as const;
const DRAG_TRAILER_COUNTS = Array.from({ length: 9 }, (_, index) => index + 2);
const FIVE_ELEMENTS = Object.keys(BASE_ELEMENT_NUMBER_MAP) as Array<keyof typeof BASE_ELEMENT_NUMBER_MAP>;

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

function toChineseNumber(value: number): string {
  const numbers = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

  if (value <= 10) {
    return numbers[value] ?? String(value);
  }

  if (value < 20) {
    return `十${numbers[value - 10] ?? ""}`;
  }

  const tens = Math.floor(value / 10);
  const units = value % 10;

  return `${numbers[tens] ?? String(tens)}十${units === 0 ? "" : numbers[units] ?? String(units)}`;
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
  return [
    {
      label: `家肖（25个）`,
      value: DOMESTIC_ZODIACS.join("、")
    },
    {
      label: `野肖（24个）`,
      value: WILD_ZODIACS.join("、")
    },
    {
      label: `红波（${getNumbersForWaveColor("red").length}个）`,
      value: getNumbersForWaveColor("red").join(",")
    },
    {
      label: `蓝波（${getNumbersForWaveColor("blue").length}个）`,
      value: getNumbersForWaveColor("blue").join(",")
    },
    {
      label: `绿波（${getNumbersForWaveColor("green").length}个）`,
      value: getNumbersForWaveColor("green").join(",")
    },
    ...FIVE_ELEMENTS.map((element) => ({
      label: `${element}（${getNumbersForElement(element, referenceDate).length}个）`,
      value: getNumbersForElement(element, referenceDate).join(",")
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
    label: `${toChineseNumber(bankers)}拖${toChineseNumber(trailers)}`,
    values: MULTIPLE_TARGETS.map((target) => {
      const legPickCount = target - 1;

      if (legPickCount <= 0 || trailers < legPickCount) {
        return null;
      }

      return bankers * combination(trailers, legPickCount);
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
        </div>

        <div className="help-panel__section">
          <span className="eyebrow">对照表</span>
          <p className="help-panel__note">家肖、野肖按当前农历年份自动换算；五行按 2025 蛇年基准整体平移。</p>
          <div className="help-panel__reference-list">
            {referenceCards.map((card) => (
              <p className="help-panel__reference-line" key={card.label}>
                {card.label}：{card.value}
              </p>
            ))}
          </div>
        </div>

        <div className="help-panel__section">
          <span className="eyebrow">复式参照表</span>
          <p className="help-panel__note">表头为复式二到复式七，行是号码个数，范围显示 3 到 15 个号。</p>
          {renderTable(
            "个数",
            MULTIPLE_TARGETS.map((target) => `复式${toChineseNumber(target)}`),
            multipleRows
          )}
        </div>

        <div className="help-panel__section">
          <span className="eyebrow">拖式参照表</span>
          <p className="help-panel__note">组合方式按“胆码个数拖拖码个数”显示，例如二拖二、二拖三到六拖十。</p>
          {renderTable(
            "组合方式",
            MULTIPLE_TARGETS.map((target) => `拖式${toChineseNumber(target)}`),
            DRAG_BANKER_COUNTS.flatMap((bankers) => buildDragRows(bankers))
          )}
        </div>
      </div>
    </Panel>
  );
}
