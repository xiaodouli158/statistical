import { useMemo } from "react";
import { buildNumberBars, buildSummaryMetrics, normalizeDrawResult, parseOrders, settleOrders, type SettledOrder } from "@statisticalsystem/parser";
import type { ExpectDetailResponse } from "@statisticalsystem/shared";

export function useExpectDetailComputed(data: ExpectDetailResponse | null) {
  return useMemo(() => {
    if (!data) {
      return {
        drawResult: null,
        settledOrders: [] as SettledOrder[],
        orderExceptions: [],
        summary: buildSummaryMetrics([]),
        numberBarsBase: buildNumberBars([], null, null)
      };
    }

    const drawResult = normalizeDrawResult(data.drawResult);
    const parsed = parseOrders(data.snapshot.messageChunks, drawResult?.openTime ?? data.snapshot.receivedAt);
    const settledOrders = settleOrders(parsed.orders, drawResult);
    const summary = buildSummaryMetrics(settledOrders);
    const numberBarsBase = buildNumberBars(settledOrders, drawResult, data.snapshot.receivedAt);

    return {
      drawResult,
      settledOrders,
      orderExceptions: parsed.exceptions,
      summary,
      numberBarsBase
    };
  }, [data]);
}
