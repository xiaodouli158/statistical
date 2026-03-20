import { Panel } from "../../../components/Panel";
import { SegmentedControl } from "../../../components/SegmentedControl";

type ChartItem = {
  key: string;
  label: string;
  sublabel?: string | null;
  amount: number;
  accent?: string | null;
  highlighted?: boolean;
};

type BarChartPanelProps<T extends string> = {
  title: string;
  items: ChartItem[];
  sortMode: T;
  onSortModeChange: (value: T) => void;
};

export function BarChartPanel<T extends string>({
  title,
  items,
  sortMode,
  onSortModeChange
}: BarChartPanelProps<T>) {
  const max = Math.max(...items.map((item) => item.amount), 1);

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
        </div>
      }
    >
      <div className="bar-chart-scroll">
        <div className="bar-chart">
          {items.map((item) => (
            <div className="bar-chart__item" key={item.key}>
              <div className="bar-chart__plot">
                <span className="bar-chart__amount">¥{item.amount.toFixed(0)}</span>
                <div
                  className={item.highlighted ? "bar-chart__bar is-highlighted" : "bar-chart__bar"}
                  style={{
                    height: `${Math.max((item.amount / max) * 150, item.amount > 0 ? 8 : 2)}px`,
                    background: item.accent ?? undefined
                  }}
                />
              </div>
              <div className="bar-chart__label-stack">
                <span className="bar-chart__label">{item.label}</span>
                <span className="bar-chart__sublabel">{item.sublabel ?? "-"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
