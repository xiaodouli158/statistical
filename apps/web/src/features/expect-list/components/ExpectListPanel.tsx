import type { UserExpectListItem } from "@statisticalsystem/shared";
import { Link } from "react-router-dom";
import { Panel } from "../../../components/Panel";
import { formatDateTime } from "../../../utils/format";

type ExpectListPanelProps = {
  title: string;
  items: UserExpectListItem[];
  buildHref: (item: UserExpectListItem) => string;
  error?: string | null;
  emptyText?: string;
};

export function ExpectListPanel({ title, items, buildHref, error = null, emptyText = "暂无结算记录" }: ExpectListPanelProps) {
  return (
    <Panel title={title}>
      {error ? <p className="error-text">{error}</p> : null}
      {items.length ? (
        <div className="list-grid">
          {items.map((item) => (
            <Link className="expect-card" key={item.expect} to={buildHref(item)}>
              <strong>{item.expect}期</strong>
              <span>快照时间：{formatDateTime(item.receivedAt)}</span>
              <span>{item.hasDrawResult ? "已开奖" : "待开奖"}</span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="muted">{emptyText}</p>
      )}
    </Panel>
  );
}
