import { LOTTERY_LABELS, type AccountRecord, type LotteryType, type UserExpectListItem } from "@statisticalsystem/shared";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LoadingScreen } from "../../components/LoadingScreen";
import { Panel } from "../../components/Panel";
import { ExpectListPanel } from "../../features/expect-list/components/ExpectListPanel";
import { useLotteryType } from "../../hooks/useLotteryType";
import { getAdminAccounts, getAdminExpects, syncAdminDraw } from "../../services/admin";

export function AdminDataViewerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { lotteryType, lotterySearch, setLotteryType } = useLotteryType();
  const selectedAccount = searchParams.get("account") ?? "";
  const [accountsState, setAccountsState] = useState<{
    data: AccountRecord[];
    loading: boolean;
    error: string | null;
  }>({
    data: [],
    loading: true,
    error: null
  });
  const [expectsState, setExpectsState] = useState<{
    data: UserExpectListItem[];
    loading: boolean;
    error: string | null;
  }>({
    data: [],
    loading: false,
    error: null
  });
  const [syncing, setSyncing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let mounted = true;

    getAdminAccounts()
      .then((data) => {
        if (mounted) {
          setAccountsState({ data, loading: false, error: null });
        }
      })
      .catch((error: Error) => {
        if (mounted) {
          setAccountsState({ data: [], loading: false, error: error.message });
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedAccount) {
      setExpectsState({ data: [], loading: false, error: null });
      return;
    }

    let mounted = true;
    setExpectsState({ data: [], loading: true, error: null });

    getAdminExpects(selectedAccount, lotteryType)
      .then((data) => {
        if (mounted) {
          setExpectsState({ data, loading: false, error: null });
        }
      })
      .catch((error: Error) => {
        if (mounted) {
          setExpectsState({ data: [], loading: false, error: error.message });
        }
      });

    return () => {
      mounted = false;
    };
  }, [selectedAccount, lotteryType, reloadToken]);

  function handleAccountChange(nextAccount: string) {
    const nextParams = new URLSearchParams(searchParams);

    if (nextAccount) {
      nextParams.set("account", nextAccount);
    } else {
      nextParams.delete("account");
    }

    setSearchParams(nextParams, { replace: true });
  }

  async function handleSyncDraw() {
    setSyncing(true);
    setActionError(null);

    try {
      await syncAdminDraw(lotteryType);
      setReloadToken((current) => current + 1);
    } catch (syncError) {
      setActionError((syncError as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  if (accountsState.loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="brand__eyebrow">{LOTTERY_LABELS[lotteryType]}</span>
          <h1>账号结算记录</h1>
        </div>
      </header>

      <Panel title="选择账号与彩种" action={<button className="ghost-button" disabled={syncing} type="button" onClick={handleSyncDraw}>{syncing ? "同步中..." : "同步当前开奖"}</button>}>
        <div className="form-grid">
          <select className="text-input" value={selectedAccount} onChange={(event) => handleAccountChange(event.target.value)}>
            <option value="">请选择账号</option>
            {accountsState.data.map((account) => (
              <option key={account.account} value={account.account}>
                {account.account}
              </option>
            ))}
          </select>
          <select className="text-input" value={lotteryType} onChange={(event) => setLotteryType(event.target.value as LotteryType)}>
            <option value="macau">{LOTTERY_LABELS.macau}</option>
            <option value="hongkong">{LOTTERY_LABELS.hongkong}</option>
          </select>
        </div>
        {accountsState.error ? <p className="error-text">{accountsState.error}</p> : null}
        {actionError ? <p className="error-text">{actionError}</p> : null}
        <p className="muted">{selectedAccount ? `已选择账号 ${selectedAccount}，下方直接展示该账号的${LOTTERY_LABELS[lotteryType]}结算记录。` : "先选择账号，再查看对应彩种的结算记录。"}</p>
      </Panel>

      {expectsState.loading ? (
        <Panel title={selectedAccount ? `${selectedAccount} · ${LOTTERY_LABELS[lotteryType]}结算记录` : "结算记录"}>
          <p className="muted">加载中...</p>
        </Panel>
      ) : (
        <ExpectListPanel
          title={selectedAccount ? `${selectedAccount} · ${LOTTERY_LABELS[lotteryType]}结算记录` : "结算记录"}
          items={expectsState.data}
          error={expectsState.error}
          emptyText={selectedAccount ? "当前账号暂无该彩种结算记录" : "请选择账号"}
          buildHref={(item) => `/admin/data/${encodeURIComponent(selectedAccount)}/${encodeURIComponent(item.expect)}${lotterySearch}`}
        />
      )}
    </div>
  );
}
