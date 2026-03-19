import { useState } from "react";
import type { HitStatus, SettledOrder } from "@statisticalsystem/parser";
import { Panel } from "../../../components/Panel";
import { formatCurrency, formatSignedCurrency } from "../../../utils/format";

function hitStatusLabel(status: HitStatus): string {
  switch (status) {
    case "win":
      return "中奖";
    case "partial":
      return "部分中奖";
    case "lose":
      return "未中奖";
    case "pending":
      return "---";
    default:
      return "---";
  }
}

type OrderTableProps = {
  orders: SettledOrder[];
  keyword: string;
  onKeywordChange: (value: string) => void;
  filter: "all" | "win" | "lose";
  onFilterChange: (value: "all" | "win" | "lose") => void;
};

function houseProfitClassName(order: SettledOrder): string {
  if (order.hitStatus === "pending" || order.houseProfit === null) {
    return "amount-text amount-text--muted";
  }

  if (order.houseProfit < 0) {
    return "amount-text amount-text--negative";
  }

  if (order.houseProfit > 0) {
    return "amount-text amount-text--positive";
  }

  return "amount-text amount-text--muted";
}

function houseProfitLabel(order: SettledOrder): string {
  if (order.hitStatus === "pending" || order.houseProfit === null) {
    return "---";
  }

  return formatSignedCurrency(order.houseProfit);
}

function orderPreviewText(order: SettledOrder): string {
  return order.content || order.raw;
}

function hitValueSet(order: SettledOrder): Set<string> {
  return new Set(order.hitValues);
}

export function OrderTable({ orders, keyword, onKeywordChange, filter, onFilterChange }: OrderTableProps) {
  const [selectedOrder, setSelectedOrder] = useState<SettledOrder | null>(null);
  const selectedHitValues = selectedOrder ? hitValueSet(selectedOrder) : null;

  return (
    <>
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
                <th>玩法</th>
                <th>订单内容</th>
                <th>注数</th>
                <th>单价</th>
                <th>金额</th>
                <th>中奖情况</th>
                <th>庄家盈亏</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  className="data-table__row is-clickable"
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedOrder(order);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <td>{order.orderNo}</td>
                  <td>{order.playType}</td>
                  <td className="data-table__content-cell">
                    <span className="order-preview__text">{orderPreviewText(order)}</span>
                  </td>
                  <td>{order.betCount}</td>
                  <td>{formatCurrency(order.unitPrice)}</td>
                  <td>{formatCurrency(order.amount)}</td>
                  <td>{hitStatusLabel(order.hitStatus)}</td>
                  <td className={houseProfitClassName(order)}>{houseProfitLabel(order)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {selectedOrder ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedOrder(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="order-detail-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__header">
              <div>
                <span className="eyebrow">订单详情</span>
                <h3 id="order-detail-title">第 {selectedOrder.orderNo} 单</h3>
              </div>
              <button className="ghost-button" type="button" onClick={() => setSelectedOrder(null)}>
                关闭
              </button>
            </div>

            <div className="order-detail-grid">
              <div>
                <span className="eyebrow">玩法</span>
                <strong>{selectedOrder.playType}</strong>
              </div>
              <div>
                <span className="eyebrow">中奖情况</span>
                <strong>{hitStatusLabel(selectedOrder.hitStatus)}</strong>
              </div>
              <div>
                <span className="eyebrow">金额</span>
                <strong>{formatCurrency(selectedOrder.amount)}</strong>
              </div>
              <div>
                <span className="eyebrow">庄家盈亏</span>
                <strong className={houseProfitClassName(selectedOrder)}>{houseProfitLabel(selectedOrder)}</strong>
              </div>
            </div>

            <div className="order-detail-section">
              <span className="eyebrow">原始内容</span>
              <p className="order-detail-section__text">{selectedOrder.sourceContent || selectedOrder.raw}</p>
            </div>

            <div className="order-detail-section">
              <span className="eyebrow">映射后内容</span>
              <p className="order-detail-section__text">{selectedOrder.content || selectedOrder.raw}</p>
            </div>

            <div className="order-detail-section">
              <span className="eyebrow">投注明细</span>
              <div className="order-number-chips">
                {selectedOrder.values.map((value, index) => (
                  <span className={selectedHitValues?.has(value) ? "order-number-chip is-hit" : "order-number-chip"} key={`${value}-${index}`}>
                    {value}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
