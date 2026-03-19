import type { HitStatus, SettledOrder } from "@statisticalsystem/parser";
import { Panel } from "../../../components/Panel";
import { formatCurrency } from "../../../utils/format";

function hitStatusLabel(status: HitStatus): string {
  switch (status) {
    case "win":
      return "中奖";
    case "partial":
      return "部分中奖";
    case "lose":
      return "未中奖";
    case "pending":
      return "待开奖";
    default:
      return "待确认";
  }
}

type OrderTableProps = {
  orders: SettledOrder[];
  keyword: string;
  onKeywordChange: (value: string) => void;
  filter: "all" | "win" | "lose";
  onFilterChange: (value: "all" | "win" | "lose") => void;
};

export function OrderTable({ orders, keyword, onKeywordChange, filter, onFilterChange }: OrderTableProps) {
  return (
    <Panel
      title="订单明细"
      action={
        <div className="panel-actions">
          <input
            className="text-input text-input--compact"
            placeholder="搜索订单内容"
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
          />
          <select className="text-input text-input--compact" value={filter} onChange={(event) => onFilterChange(event.target.value as typeof filter)}>
            <option value="all">全部</option>
            <option value="win">仅中奖</option>
            <option value="lose">仅未中奖</option>
          </select>
        </div>
      }
    >
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>订单号</th>
              <th>订单内容</th>
              <th>注数</th>
              <th>单价</th>
              <th>金额</th>
              <th>中奖情况</th>
              <th>派彩/结果</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.orderNo}</td>
                <td>{order.content || order.raw}</td>
                <td>{order.betCount}</td>
                <td>{formatCurrency(order.unitPrice)}</td>
                <td>{formatCurrency(order.amount)}</td>
                <td>{hitStatusLabel(order.hitStatus)}</td>
                <td>{order.hitStatus === "pending" ? "待开奖" : order.resultText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
