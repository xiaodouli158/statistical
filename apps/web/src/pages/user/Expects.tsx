import { useEffect, useState } from "react";
import { LOTTERY_LABELS, type UserExpectListItem } from "@statisticalsystem/shared";
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "../../components/LoadingScreen";
import { Panel } from "../../components/Panel";
import { useLotteryType } from "../../hooks/useLotteryType";
import { getUserExpects } from "../../services/user";

export function ExpectsPage() {
  const navigate = useNavigate();
  const { lotteryType, lotterySearch } = useLotteryType();
  const [state, setState] = useState<{
    latest: UserExpectListItem | null;
    loading: boolean;
    error: string | null;
  }>({
    latest: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    getUserExpects(lotteryType)
      .then((data) => {
        if (!mounted) {
          return;
        }

        const latest = data[0] ?? null;

        if (latest) {
          navigate(`/expects/${latest.expect}${lotterySearch}`, { replace: true });
          return;
        }

        setState({ latest: null, loading: false, error: null });
      })
      .catch((error: Error) => {
        if (mounted) {
          setState({ latest: null, loading: false, error: error.message });
        }
      });

    return () => {
      mounted = false;
    };
  }, [lotteryType, lotterySearch, navigate]);

  if (state.loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="brand__eyebrow">{LOTTERY_LABELS[lotteryType]}</span>
          <h1>当前结算</h1>
        </div>
      </header>

      <Panel title={`${LOTTERY_LABELS[lotteryType]} 当前期数`}>
        {state.error ? <p className="error-text">{state.error}</p> : <p className="muted">暂无结算记录</p>}
      </Panel>
    </div>
  );
}
