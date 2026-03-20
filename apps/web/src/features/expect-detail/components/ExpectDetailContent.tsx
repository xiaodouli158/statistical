import { useMemo, useState, type PropsWithChildren } from "react";
import type { ExpectDetailResponse, NumberSortMode, OrderFilter } from "@statisticalsystem/shared";
import { sortNumberBars } from "../../../utils/charts";
import { BarChartPanel } from "./BarChartPanel";
import { ExpectHeader } from "./ExpectHeader";
import { OrderExceptionList } from "./OrderExceptionList";
import { OrderTable } from "./OrderTable";
import { SummaryCards } from "./SummaryCards";
import { useExpectDetailComputed } from "../hooks/useExpectDetailComputed";

const WAVE_ACCENTS: Record<string, string> = {
  red: "linear-gradient(180deg, #ff9972 0%, #d9485a 100%)",
  blue: "linear-gradient(180deg, #7ca8ff 0%, #2f5fd7 100%)",
  green: "linear-gradient(180deg, #82dba7 0%, #1f8b5e 100%)"
};

type ExpectDetailContentProps = PropsWithChildren<{
  data: ExpectDetailResponse;
}>;

export function ExpectDetailContent({ data, children }: ExpectDetailContentProps) {
  const computed = useExpectDetailComputed(data);
  const [orderKeyword, setOrderKeyword] = useState("");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [numberSortMode, setNumberSortMode] = useState<NumberSortMode>("natural");

  const visibleOrders = useMemo(() => {
    return computed.settledOrders.filter((order) => {
      const keywordMatched = !orderKeyword || order.content.includes(orderKeyword) || order.raw.includes(orderKeyword);
      const filterMatched =
        orderFilter === "all" ||
        (orderFilter === "win" && (order.hitStatus === "win" || order.hitStatus === "partial")) ||
        (orderFilter === "lose" && order.hitStatus === "lose");

      return keywordMatched && filterMatched;
    });
  }, [computed.settledOrders, orderKeyword, orderFilter]);

  const visibleNumberBars = useMemo(() => sortNumberBars(computed.numberBarsBase, numberSortMode), [computed.numberBarsBase, numberSortMode]);

  return (
    <div className="page-stack">
      <ExpectHeader
        lotteryType={data.lotteryType}
        expect={data.snapshot.expect}
        receivedAt={data.snapshot.receivedAt}
        drawResult={computed.drawResult}
      />
      <SummaryCards summary={computed.summary} />
      <BarChartPanel
        title="特码柱状图"
        items={visibleNumberBars.map((item) => ({
          key: item.number,
          label: item.number,
          sublabel: item.zodiac,
          amount: item.amount,
          accent: item.isDrawn ? WAVE_ACCENTS[item.wave ?? "blue"] : undefined,
          highlighted: item.isDrawn
        }))}
        sortMode={numberSortMode}
        onSortModeChange={setNumberSortMode}
      />
      <OrderExceptionList exceptions={computed.orderExceptions} />
      <OrderTable
        orders={visibleOrders}
        keyword={orderKeyword}
        onKeywordChange={setOrderKeyword}
        filter={orderFilter}
        onFilterChange={setOrderFilter}
      />
      {children}
    </div>
  );
}
