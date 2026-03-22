import { DEFAULT_LOTTERY_TYPE, LOTTERY_LABELS } from "@statisticalsystem/shared";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LoadingScreen } from "../../components/LoadingScreen";
import { Panel } from "../../components/Panel";
import { ExpectDetailContent } from "../../features/expect-detail/components/ExpectDetailContent";
import { useExpectDetailQuery } from "../../features/expect-detail/hooks/useExpectDetailQuery";
import { useLotteryType } from "../../hooks/useLotteryType";
import { getAdminExpectDetail, syncAdminDraw } from "../../services/admin";

export function AdminDataDetailPage() {
  const { account = "", expect = "" } = useParams();
  const { lotteryType } = useLotteryType();
  const [refreshToken, setRefreshToken] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, loading, error } = useExpectDetailQuery(`${account}:${lotteryType}:${expect}:${refreshToken}`, () =>
    getAdminExpectDetail(account, expect, lotteryType)
  );

  const backSearch = useMemo(() => {
    const params = new URLSearchParams();

    if (account) {
      params.set("account", account);
    }

    if (lotteryType !== DEFAULT_LOTTERY_TYPE) {
      params.set("lottery", lotteryType);
    }

    const search = params.toString();
    return search ? `?${search}` : "";
  }, [account, lotteryType]);

  async function handleSyncDraw() {
    setSyncing(true);
    setActionError(null);

    try {
      await syncAdminDraw(lotteryType, expect || undefined);
      setRefreshToken((current) => current + 1);
    } catch (syncError) {
      setActionError((syncError as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="brand__eyebrow">
            {account} · {LOTTERY_LABELS[lotteryType]}
          </span>
          <h1>{expect}期结算详情</h1>
        </div>
        <div className="panel-actions">
          <Link className="ghost-button" to={`/admin/data${backSearch}`}>
            返回记录列表
          </Link>
          <button className="ghost-button" disabled={syncing} type="button" onClick={handleSyncDraw}>
            {syncing ? "同步中..." : "同步本期开奖"}
          </button>
        </div>
      </header>

      {actionError ? <p className="error-text">{actionError}</p> : null}

      {error || !data ? (
        <p className="error-text">{error ?? `${LOTTERY_LABELS[lotteryType]}数据不存在`}</p>
      ) : (
        <ExpectDetailContent data={data}>
          <Panel title="管理员原始数据">
            <pre className="code-block">{JSON.stringify({ snapshot: data.rawSnapshot, drawResult: data.drawResult, computeCache: data.computeCache }, null, 2)}</pre>
          </Panel>
        </ExpectDetailContent>
      )}
    </div>
  );
}
