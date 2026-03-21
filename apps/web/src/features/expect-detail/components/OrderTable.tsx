import { useEffect, useMemo, useRef, useState } from "react";
import type { HitStatus, SettledOrder } from "@statisticalsystem/parser";
import { Panel } from "../../../components/Panel";
import { formatCurrency, formatSignedCurrency } from "../../../utils/format";

const ORDER_ROW_HEIGHT = 76;
const ORDER_ROW_OVERSCAN = 6;
const ORDER_VIEWPORT_ROW_COUNT = 8;
const ORDER_VIEWPORT_MIN_ROWS = 3;

const COLUMN_HEADERS = ["订单号", "玩法", "订单内容", "注数", "单价", "金额", "中奖情况", "庄家盈亏"] as const;

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
  isFiltering?: boolean;
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

export function OrderTable({ orders, keyword, onKeywordChange, filter, onFilterChange, isFiltering = false }: OrderTableProps) {
  const [selectedOrder, setSelectedOrder] = useState<SettledOrder | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const selectedHitValues = selectedOrder ? hitValueSet(selectedOrder) : null;
  const viewportHeight = Math.min(Math.max(orders.length, ORDER_VIEWPORT_MIN_ROWS), ORDER_VIEWPORT_ROW_COUNT) * ORDER_ROW_HEIGHT;
  const totalHeight = orders.length * ORDER_ROW_HEIGHT;

  const visibleRange = useMemo(() => {
    if (orders.length === 0) {
      return {
        startIndex: 0,
        endIndex: 0,
        offsetTop: 0,
        items: [] as SettledOrder[]
      };
    }

    const startIndex = Math.max(0, Math.floor(scrollTop / ORDER_ROW_HEIGHT) - ORDER_ROW_OVERSCAN);
    const endIndex = Math.min(orders.length, Math.ceil((scrollTop + viewportHeight) / ORDER_ROW_HEIGHT) + ORDER_ROW_OVERSCAN);

    return {
      startIndex,
      endIndex,
      offsetTop: startIndex * ORDER_ROW_HEIGHT,
      items: orders.slice(startIndex, endIndex)
    };
  }, [orders, scrollTop, viewportHeight]);

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: 0 });
    setScrollTop(0);
  }, [orders]);

  useEffect(() => {
    if (!selectedOrder) {
      return;
    }

    if (!orders.some((order) => order.id === selectedOrder.id)) {
      setSelectedOrder(null);
    }
  }, [orders, selectedOrder]);

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
        <div className="order-table__summary">
          <span>共 {orders.length} 单</span>
          <span className={isFiltering ? "order-table__summary-text is-pending" : "order-table__summary-text"}>
            {isFiltering
              ? "正在更新筛选结果..."
              : orders.length === 0
                ? "暂无匹配订单"
                : `窗口渲染 ${visibleRange.startIndex + 1}-${visibleRange.endIndex} / ${orders.length}`}
          </span>
        </div>

        <div className="table-wrap">
          <div className="order-table" aria-label="订单明细">
            <div className="order-table__header">
              {COLUMN_HEADERS.map((title) => (
                <div className="order-table__cell order-table__cell--header" key={title}>
                  {title}
                </div>
              ))}
            </div>

            <div
              className="order-table__viewport"
              onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
              ref={viewportRef}
              style={{ height: `${viewportHeight}px` }}
            >
              {orders.length === 0 ? (
                <div className="order-table__empty">暂无匹配订单</div>
              ) : (
                <div className="order-table__spacer" style={{ height: `${totalHeight}px` }}>
                  <div className="order-table__window" style={{ transform: `translateY(${visibleRange.offsetTop}px)` }}>
                    {visibleRange.items.map((order) => (
                      <div
                        className="order-table__row"
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedOrder(order);
                          }
                        }}
                        role="button"
                        style={{ height: `${ORDER_ROW_HEIGHT}px` }}
                        tabIndex={0}
                      >
                        <div className="order-table__cell">{order.orderNo}</div>
                        <div className="order-table__cell">{order.playType}</div>
                        <div className="order-table__cell order-table__cell--content">
                          <span className="order-preview__text order-table__content">{orderPreviewText(order)}</span>
                        </div>
                        <div className="order-table__cell">{order.betCount}</div>
                        <div className="order-table__cell">{formatCurrency(order.unitPrice)}</div>
                        <div className="order-table__cell">{formatCurrency(order.amount)}</div>
                        <div className="order-table__cell">{hitStatusLabel(order.hitStatus)}</div>
                        <div className={`order-table__cell ${houseProfitClassName(order)}`}>{houseProfitLabel(order)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
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
              <span className="eyebrow">解析后内容</span>
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
