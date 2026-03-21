import { buildNumberBars, buildSummaryMetrics, normalizeDrawResult, parseOrders, settleOrders } from "@statisticalsystem/parser";
import type {
  AdminExpectDetailResponse,
  ExpectDetailComputed as SharedExpectDetailComputed,
  ExpectDetailViewResponse,
  SnapshotRecord
} from "@statisticalsystem/shared";
import { ORDER_ODDS_CONFIG } from "../../../config/odds";

export type ExpectDetailComputed = SharedExpectDetailComputed;

type ExpectDetailComputedSource = ExpectDetailViewResponse | AdminExpectDetailResponse;

function resolveSnapshotSource(data: ExpectDetailComputedSource): SnapshotRecord | null {
  if ("rawSnapshot" in data) {
    return data.rawSnapshot;
  }

  const legacySnapshot = data.snapshot as SnapshotRecord | undefined;
  return Array.isArray(legacySnapshot?.messageChunks) ? legacySnapshot : null;
}

export function createEmptyExpectDetailComputed(): ExpectDetailComputed {
  return {
    settledOrders: [],
    orderExceptions: [],
    summary: {
      orderCount: 0,
      winOrderCount: null,
      loseOrderCount: null,
      winAmount: null,
      totalAmount: 0,
      profit: null
    },
    numberBarsBase: []
  };
}

export function buildExpectDetailComputed(data: ExpectDetailComputedSource | null): ExpectDetailComputed {
  if (!data) {
    return createEmptyExpectDetailComputed();
  }

  if (data.computed) {
    return data.computed;
  }

  const snapshot = resolveSnapshotSource(data);

  if (!snapshot) {
    return createEmptyExpectDetailComputed();
  }

  const drawResult = normalizeDrawResult(data.drawResult);
  const parsed = parseOrders(snapshot.messageChunks, drawResult?.openTime ?? snapshot.receivedAt, ORDER_ODDS_CONFIG);
  const settledOrders = settleOrders(parsed.orders, drawResult);

  return {
    settledOrders,
    orderExceptions: parsed.exceptions,
    summary: buildSummaryMetrics(settledOrders),
    numberBarsBase: buildNumberBars(settledOrders, drawResult, snapshot.receivedAt)
  };
}
