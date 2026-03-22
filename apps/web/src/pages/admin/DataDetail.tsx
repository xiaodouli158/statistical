import { DEFAULT_LOTTERY_TYPE, LOTTERY_LABELS, normalizeLotteryType } from "@statisticalsystem/shared";
import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { LoadingScreen } from "../../components/LoadingScreen";
import { Panel } from "../../components/Panel";
import { ExpectDetailContent } from "../../features/expect-detail/components/ExpectDetailContent";
import { useExpectDetailQuery } from "../../features/expect-detail/hooks/useExpectDetailQuery";
import { getAdminMailRecordDetail, syncAdminDraw } from "../../services/admin";

export function AdminDataDetailPage() {
  const { recordId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const [refreshToken, setRefreshToken] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const fallbackAccount = searchParams.get("account") ?? "";
  const filterExpect = searchParams.get("expect");
  const fallbackLotteryType = normalizeLotteryType(searchParams.get("lottery"));
  const { data, loading, error } = useExpectDetailQuery(`record:${recordId}:${refreshToken}`, () => getAdminMailRecordDetail(recordId));

  const account = data?.rawRecord.account ?? fallbackAccount;
  const lotteryType = data?.lotteryType ?? fallbackLotteryType;
  const expect = data?.snapshot.expect ?? "";

  const backSearch = useMemo(() => {
    const params = new URLSearchParams();

    if (account) {
      params.set("account", account);
    }

    if (lotteryType !== DEFAULT_LOTTERY_TYPE) {
      params.set("lottery", lotteryType);
    }

    if (filterExpect) {
      params.set("expect", filterExpect);
    }

    const search = params.toString();
    return search ? `?${search}` : "";
  }, [account, filterExpect, lotteryType]);

  async function handleSyncDraw() {
    if (!data) {
      return;
    }

    setSyncing(true);
    setActionError(null);

    try {
      await syncAdminDraw(data.lotteryType, data.snapshot.expect);
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
          <h1>{expect ? `${expect}期邮件结算详情` : "邮件结算详情"}</h1>
          {data ? <p className="muted">{data.rawRecord.isLatestSnapshot ? "当前展示的是最新邮件记录。" : "当前展示的是历史邮件记录。"}</p> : null}
        </div>
        <div className="panel-actions">
          <Link className="ghost-button" to={`/admin/data${backSearch}`}>
            返回邮件列表
          </Link>
          <button className="ghost-button" disabled={syncing || !data} type="button" onClick={handleSyncDraw}>
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
            <pre className="code-block">{JSON.stringify({ record: data.rawRecord, drawResult: data.drawResult, computeCache: data.computeCache }, null, 2)}</pre>
          </Panel>
        </ExpectDetailContent>
      )}
    </div>
  );
}
