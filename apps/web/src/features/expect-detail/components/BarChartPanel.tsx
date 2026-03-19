import { Panel } from "../../../components/Panel";
import { SegmentedControl } from "../../../components/SegmentedControl";

type ChartItem = {
  key: string;
  label: string;
  amount: number;
  accent?: string | null;
  highlighted?: boolean;
};

type BarChartPanelProps<T extends string> = {
  title: string;
  items: ChartItem[];
  sortMode: T;
  onSortModeChange: (value: T) => void;
  showAll: boolean;
  onShowAllChange: (value: boolean) => void;
};

export function BarChartPanel<T extends string>({
  title,
  items,
  sortMode,
  onSortModeChange,
  showAll,
  onShowAllChange
}: BarChartPanelProps<T>) {
  const max = Math.max(...items.map((item) => item.amount), 1);
  const visibleItems = showAll ? items : items.filter((item) => item.amount > 0);

  return (
    <Panel
      title={title}
      action={
        <div className="panel-actions">
          <SegmentedControl
            value={sortMode}
            options={[
              { label: "顺序", value: "natural" as T },
              { label: "金额", value: "amountDesc" as T }
            ]}
            onChange={onSortModeChange}
          />
          <button className="ghost-button" type="button" onClick={() => onShowAllChange(!showAll)}>
            {showAll ? "仅显示有金额" : "显示全部"}
          </button>
        </div>
      }
    >
      <div className="bar-chart">
        {visibleItems.map((item) => (
          <div className="bar-chart__item" key={item.key}>
            <span className="bar-chart__amount">¥{item.amount.toFixed(0)}</span>
            <div
              className={item.highlighted ? "bar-chart__bar is-highlighted" : "bar-chart__bar"}
              style={{
                height: `${Math.max((item.amount / max) * 160, item.amount > 0 ? 8 : 2)}px`,
                background: item.accent ?? undefined
              }}
            />
            <span className="bar-chart__label">{item.label}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
