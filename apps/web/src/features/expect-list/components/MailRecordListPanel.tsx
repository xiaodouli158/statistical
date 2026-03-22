import type { AdminMailRecordListItem } from "@statisticalsystem/shared";
import { Link } from "react-router-dom";
import { Panel } from "../../../components/Panel";
import { formatDateTime } from "../../../utils/format";

type MailRecordListPanelProps = {
  title: string;
  items: AdminMailRecordListItem[];
  buildHref: (item: AdminMailRecordListItem) => string;
  error?: string | null;
  emptyText?: string;
};

export function MailRecordListPanel({
  title,
  items,
  buildHref,
  error = null,
  emptyText = "暂无邮件记录"
}: MailRecordListPanelProps) {
  return (
    <Panel title={title}>
      {error ? <p className="error-text">{error}</p> : null}
      {items.length ? (
        <div className="list-grid">
          {items.map((item) => (
            <Link className="expect-card" key={item.id} to={buildHref(item)}>
              <strong>{item.expect}期</strong>
              <span>邮件时间：{formatDateTime(item.receivedAt)}</span>
              <span>{item.isLatestSnapshot ? "最新邮件" : "历史邮件"}</span>
              <span>{item.hasDrawResult ? "已开奖" : "待开奖"}</span>
              {item.mailSubject ? <span>{item.mailSubject}</span> : null}
            </Link>
          ))}
        </div>
      ) : (
        <p className="muted">{emptyText}</p>
      )}
    </Panel>
  );
}
