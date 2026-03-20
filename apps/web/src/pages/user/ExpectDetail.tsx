import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { LOTTERY_LABELS } from "@statisticalsystem/shared";
import { sortNumberBars } from "../../utils/charts";
import { LoadingScreen } from "../../components/LoadingScreen";
import { BarChartPanel } from "../../features/expect-detail/components/BarChartPanel";
import { ExpectHeader } from "../../features/expect-detail/components/ExpectHeader";
import { OrderExceptionList } from "../../features/expect-detail/components/OrderExceptionList";
import { OrderTable } from "../../features/expect-detail/components/OrderTable";
import { SummaryCards } from "../../features/expect-detail/components/SummaryCards";
import { useExpectDetailComputed } from "../../features/expect-detail/hooks/useExpectDetailComputed";
import { useExpectDetailQuery } from "../../features/expect-detail/hooks/useExpectDetailQuery";
import { useLotteryType } from "../../hooks/useLotteryType";

const WAVE_ACCENTS: Record<string, string> = {
  red: "linear-gradient(180deg, #ff9972 0%, #d9485a 100%)",
  blue: "linear-gradient(180deg, #7ca8ff 0%, #2f5fd7 100%)",
  green: "linear-gradient(180deg, #82dba7 0%, #1f8b5e 100%)"
};

export function ExpectDetailPage() {
  const { expect = "" } = useParams();
  const { lotteryType } = useLotteryType();
  const { data, loading, error } = useExpectDetailQuery(expect, lotteryType);
  const computed = useExpectDetailComputed(data);
  const [orderKeyword, setOrderKeyword] = useState("");
  const [orderFilter, setOrderFilter] = useState<"all" | "win" | "lose">("all");
  const [numberSortMode, setNumberSortMode] = useState<"natural" | "amountDesc">("natural");
  const [showAllNumberBars, setShowAllNumberBars] = useState(true);

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

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !data) {
    return (
      <div className="page-stack">
        <p className="error-text">{error ?? `${LOTTERY_LABELS[lotteryType]}数据不存在`}</p>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <ExpectHeader lotteryType={lotteryType} expect={data.snapshot.expect} receivedAt={data.snapshot.receivedAt} drawResult={computed.drawResult} />
      <SummaryCards summary={computed.summary} />
      <BarChartPanel
        title="特码柱状图"
        items={visibleNumberBars.map((item) => ({
          key: item.number,
          label: item.number,
          amount: item.amount,
          accent: item.isDrawn ? WAVE_ACCENTS[item.wave ?? "blue"] : undefined,
          highlighted: item.isDrawn
        }))}
        sortMode={numberSortMode}
        onSortModeChange={setNumberSortMode}
        showAll={showAllNumberBars}
        onShowAllChange={setShowAllNumberBars}
      />
      <OrderExceptionList exceptions={computed.orderExceptions} />
      <OrderTable
        orders={visibleOrders}
        keyword={orderKeyword}
        onKeywordChange={setOrderKeyword}
        filter={orderFilter}
        onFilterChange={setOrderFilter}
      />
    </div>
  );
}
