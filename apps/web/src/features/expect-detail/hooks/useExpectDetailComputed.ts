import { useMemo } from "react";
import { buildNumberBars, buildSummaryMetrics, buildZodiacBars, normalizeDrawResult, parseOrders, settleOrders, type SettledOrder } from "@statisticalsystem/parser";
import type { ExpectDetailResponse } from "@statisticalsystem/shared";

export function useExpectDetailComputed(data: ExpectDetailResponse | null) {
  return useMemo(() => {
    if (!data) {
      return {
        drawResult: null,
        settledOrders: [] as SettledOrder[],
        summary: buildSummaryMetrics([]),
        numberBarsBase: buildNumberBars([], null),
        zodiacBarsBase: buildZodiacBars([], null)
      };
    }

    const drawResult = normalizeDrawResult(data.drawResult);
    const parsedOrders = parseOrders(data.snapshot.messageChunks);
    const settledOrders = settleOrders(parsedOrders, drawResult);
    const summary = buildSummaryMetrics(settledOrders);
    const numberBarsBase = buildNumberBars(settledOrders, drawResult);
    const zodiacBarsBase = buildZodiacBars(settledOrders, drawResult);

    return {
      drawResult,
      settledOrders,
      summary,
      numberBarsBase,
      zodiacBarsBase
    };
  }, [data]);
}
