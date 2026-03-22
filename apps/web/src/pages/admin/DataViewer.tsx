import { LOTTERY_LABELS, type AdminMailRecordListItem, type LotteryType, type UserRecord } from "@statisticalsystem/shared";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LoadingScreen } from "../../components/LoadingScreen";
import { Panel } from "../../components/Panel";
import { MailRecordListPanel } from "../../features/expect-list/components/MailRecordListPanel";
import { useLotteryType } from "../../hooks/useLotteryType";
import { getAdminMailRecords, getAdminUsers, syncAdminDraw } from "../../services/admin";

export function AdminDataViewerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { lotteryType, setLotteryType } = useLotteryType();
  const selectedAccount = searchParams.get("account") ?? "";
  const [usersState, setUsersState] = useState<{
    data: UserRecord[];
    loading: boolean;
    error: string | null;
  }>({
    data: [],
    loading: true,
    error: null
  });
  const [recordsState, setRecordsState] = useState<{
    data: AdminMailRecordListItem[];
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

    getAdminUsers()
      .then((data) => {
        if (mounted) {
          setUsersState({
            data: data.filter((user) => user.role === "user"),
            loading: false,
            error: null
          });
        }
      })
      .catch((error: Error) => {
        if (mounted) {
          setUsersState({ data: [], loading: false, error: error.message });
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedAccount) {
      setRecordsState({ data: [], loading: false, error: null });
      return;
    }

    let mounted = true;
    setRecordsState({ data: [], loading: true, error: null });

    getAdminMailRecords(selectedAccount, lotteryType)
      .then((data) => {
        if (mounted) {
          setRecordsState({ data, loading: false, error: null });
        }
      })
      .catch((error: Error) => {
        if (mounted) {
          setRecordsState({ data: [], loading: false, error: error.message });
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

  function buildUserLabel(user: UserRecord): string {
    const statusParts = [];

    if (user.status === "disabled") {
      statusParts.push("停用");
    }

    if (user.isExpired) {
      statusParts.push("过期");
    }

    const suffix = statusParts.length > 0 ? ` · ${statusParts.join(" / ")}` : "";
    return `${user.account} · ${user.username}${suffix}`;
  }

  function buildRecordHref(item: AdminMailRecordListItem): string {
    const params = new URLSearchParams();

    if (selectedAccount) {
      params.set("account", selectedAccount);
    }

    if (lotteryType !== "macau") {
      params.set("lottery", lotteryType);
    }

    const search = params.toString();
    return `/admin/data/records/${encodeURIComponent(item.id)}${search ? `?${search}` : ""}`;
  }

  if (usersState.loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="brand__eyebrow">{LOTTERY_LABELS[lotteryType]}</span>
          <h1>用户邮件记录</h1>
        </div>
      </header>

      <Panel
        title="选择用户和彩种"
        action={
          <button className="ghost-button" disabled={syncing} type="button" onClick={handleSyncDraw}>
            {syncing ? "同步中..." : "同步当前开奖"}
          </button>
        }
      >
        <div className="form-grid">
          <select className="text-input" value={selectedAccount} onChange={(event) => handleAccountChange(event.target.value)}>
            <option value="">请选择用户编号</option>
            {usersState.data.map((user) => (
              <option key={user.id} value={user.account}>
                {buildUserLabel(user)}
              </option>
            ))}
          </select>
          <select className="text-input" value={lotteryType} onChange={(event) => setLotteryType(event.target.value as LotteryType)}>
            <option value="macau">{LOTTERY_LABELS.macau}</option>
            <option value="hongkong">{LOTTERY_LABELS.hongkong}</option>
          </select>
        </div>
        {usersState.error ? <p className="error-text">{usersState.error}</p> : null}
        {actionError ? <p className="error-text">{actionError}</p> : null}
        <p className="muted">
          {selectedAccount
            ? `当前正在查看账号 ${selectedAccount} 的 ${LOTTERY_LABELS[lotteryType]} 全部邮件记录。`
            : "先选择一个用户账号，再查看对应彩种的全部邮件记录。"}
        </p>
      </Panel>

      {recordsState.loading ? (
        <Panel title={selectedAccount ? `${selectedAccount} · ${LOTTERY_LABELS[lotteryType]} 邮件记录` : "邮件记录"}>
          <p className="muted">加载中...</p>
        </Panel>
      ) : (
        <MailRecordListPanel
          title={selectedAccount ? `${selectedAccount} · ${LOTTERY_LABELS[lotteryType]} 邮件记录` : "邮件记录"}
          items={recordsState.data}
          error={recordsState.error}
          emptyText={selectedAccount ? "当前账号暂无该彩种邮件记录" : "请选择用户账号"}
          buildHref={buildRecordHref}
        />
      )}
    </div>
  );
}
