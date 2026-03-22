import { LOTTERY_LABELS, type AdminMailRecordListItem, type LotteryType, type UserExpectListItem, type UserRecord } from "@statisticalsystem/shared";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LoadingScreen } from "../../components/LoadingScreen";
import { Panel } from "../../components/Panel";
import { MailRecordListPanel } from "../../features/expect-list/components/MailRecordListPanel";
import { useLotteryType } from "../../hooks/useLotteryType";
import { getAdminExpects, getAdminMailRecords, getAdminUsers, syncAdminDraw } from "../../services/admin";

const ALL_EXPECT_VALUE = "__all__";

export function AdminDataViewerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { lotteryType } = useLotteryType();
  const selectedAccount = searchParams.get("account") ?? "";
  const selectedExpectParam = searchParams.get("expect") ?? "";
  const [usersState, setUsersState] = useState<{
    data: UserRecord[];
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
      setExpectsState({ data: [], loading: false, error: null });
      setRecordsState({ data: [], loading: false, error: null });
      return;
    }

    let mounted = true;
    setExpectsState({ data: [], loading: true, error: null });

    getAdminExpects(selectedAccount, lotteryType)
      .then((data) => {
        if (!mounted) {
          return;
        }

        setExpectsState({ data, loading: false, error: null });

        if (selectedExpectParam === ALL_EXPECT_VALUE) {
          return;
        }

        const currentExpect = data[0]?.expect ?? "";
        const hasSelectedExpect = data.some((item) => item.expect === selectedExpectParam);

        if (!currentExpect) {
          if (selectedExpectParam) {
            const nextParams = new URLSearchParams();
            nextParams.set("account", selectedAccount);

            if (lotteryType !== "macau") {
              nextParams.set("lottery", lotteryType);
            }

            setSearchParams(nextParams, { replace: true });
          }

          return;
        }

        if (!selectedExpectParam || !hasSelectedExpect) {
          const nextParams = new URLSearchParams();
          nextParams.set("account", selectedAccount);
          nextParams.set("expect", currentExpect);

          if (lotteryType !== "macau") {
            nextParams.set("lottery", lotteryType);
          }

          setSearchParams(nextParams, { replace: true });
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
  }, [selectedAccount, lotteryType, reloadToken, selectedExpectParam, setSearchParams]);

  const selectedExpectValue = useMemo(() => {
    if (selectedExpectParam === ALL_EXPECT_VALUE) {
      return expectsState.data.length > 0 ? ALL_EXPECT_VALUE : "";
    }

    if (expectsState.data.some((item) => item.expect === selectedExpectParam)) {
      return selectedExpectParam;
    }

    return expectsState.data[0]?.expect ?? "";
  }, [expectsState.data, selectedExpectParam]);

  const selectedExpectFilter = selectedExpectValue && selectedExpectValue !== ALL_EXPECT_VALUE ? selectedExpectValue : undefined;

  useEffect(() => {
    if (!selectedAccount) {
      setRecordsState({ data: [], loading: false, error: null });
      return;
    }

    if (expectsState.loading) {
      setRecordsState({ data: [], loading: true, error: null });
      return;
    }

    if (expectsState.error) {
      setRecordsState({ data: [], loading: false, error: expectsState.error });
      return;
    }

    if (!selectedExpectFilter && expectsState.data.length === 0) {
      setRecordsState({ data: [], loading: false, error: null });
      return;
    }

    let mounted = true;
    setRecordsState({ data: [], loading: true, error: null });

    getAdminMailRecords(selectedAccount, lotteryType, selectedExpectFilter)
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
  }, [selectedAccount, lotteryType, selectedExpectFilter, expectsState.data.length, expectsState.error, expectsState.loading]);

  function handleAccountChange(nextAccount: string) {
    const nextParams = new URLSearchParams(searchParams);

    if (nextAccount) {
      nextParams.set("account", nextAccount);
    } else {
      nextParams.delete("account");
    }

    nextParams.delete("expect");
    setSearchParams(nextParams, { replace: true });
  }

  function handleLotteryTypeChange(nextLotteryType: LotteryType) {
    const nextParams = new URLSearchParams(searchParams);

    if (nextLotteryType === "macau") {
      nextParams.delete("lottery");
    } else {
      nextParams.set("lottery", nextLotteryType);
    }

    nextParams.delete("expect");
    setSearchParams(nextParams, { replace: true });
  }

  function handleExpectChange(nextExpect: string) {
    const nextParams = new URLSearchParams(searchParams);

    if (nextExpect) {
      nextParams.set("expect", nextExpect);
    } else {
      nextParams.delete("expect");
    }

    setSearchParams(nextParams, { replace: true });
  }

  async function handleSyncDraw() {
    setSyncing(true);
    setActionError(null);

    try {
      await syncAdminDraw(lotteryType, selectedExpectFilter);
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

    if (selectedExpectValue) {
      params.set("expect", selectedExpectValue);
    }

    const search = params.toString();
    return `/admin/data/records/${encodeURIComponent(item.id)}${search ? `?${search}` : ""}`;
  }

  function renderExpectOptions() {
    const currentExpect = expectsState.data[0]?.expect ?? "";

    if (!selectedAccount) {
      return <option value="">请先选择用户</option>;
    }

    if (expectsState.loading) {
      return <option value="">加载期数中...</option>;
    }

    if (!currentExpect) {
      return <option value="">暂无期数</option>;
    }

    return (
      <>
        <option value={currentExpect}>{currentExpect}期（当前）</option>
        <option value={ALL_EXPECT_VALUE}>全部期数</option>
        {expectsState.data.slice(1).map((item) => (
          <option key={item.expect} value={item.expect}>
            {item.expect}期
          </option>
        ))}
      </>
    );
  }

  const filterLabel = selectedExpectValue === ALL_EXPECT_VALUE ? "全部期数" : selectedExpectValue ? `${selectedExpectValue}期` : "当前期";

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
        title="选择用户、彩种和期数"
        action={
          <button className="ghost-button" disabled={syncing} type="button" onClick={handleSyncDraw}>
            {syncing ? "同步中..." : selectedExpectFilter ? "同步所选期数" : "同步当前开奖"}
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
          <select className="text-input" value={lotteryType} onChange={(event) => handleLotteryTypeChange(event.target.value as LotteryType)}>
            <option value="macau">{LOTTERY_LABELS.macau}</option>
            <option value="hongkong">{LOTTERY_LABELS.hongkong}</option>
          </select>
          <select
            className="text-input"
            disabled={!selectedAccount || expectsState.loading || expectsState.data.length === 0}
            value={selectedExpectValue}
            onChange={(event) => handleExpectChange(event.target.value)}
          >
            {renderExpectOptions()}
          </select>
        </div>
        {usersState.error ? <p className="error-text">{usersState.error}</p> : null}
        {expectsState.error ? <p className="error-text">{expectsState.error}</p> : null}
        {actionError ? <p className="error-text">{actionError}</p> : null}
        <p className="muted">
          {selectedAccount
            ? `当前正在查看账号 ${selectedAccount} 的 ${LOTTERY_LABELS[lotteryType]} ${filterLabel} 邮件记录。`
            : "先选择一个用户账号，再查看对应彩种和期数的邮件记录。"}
        </p>
      </Panel>

      {recordsState.loading ? (
        <Panel title={selectedAccount ? `${selectedAccount} · ${LOTTERY_LABELS[lotteryType]} · ${filterLabel}` : "邮件记录"}>
          <p className="muted">加载中...</p>
        </Panel>
      ) : (
        <MailRecordListPanel
          title={selectedAccount ? `${selectedAccount} · ${LOTTERY_LABELS[lotteryType]} · ${filterLabel}` : "邮件记录"}
          items={recordsState.data}
          error={recordsState.error}
          emptyText={selectedAccount ? "当前筛选条件下暂无邮件记录" : "请选择用户账号"}
          buildHref={buildRecordHref}
        />
      )}
    </div>
  );
}
