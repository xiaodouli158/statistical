import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LOTTERY_LABELS, type UserExpectListItem } from "@statisticalsystem/shared";
import { LoadingScreen } from "../../components/LoadingScreen";
import { Panel } from "../../components/Panel";
import { useLotteryType } from "../../hooks/useLotteryType";
import { getUserExpects } from "../../services/user";
import { formatDateTime } from "../../utils/format";

export function ExpectsPage() {
  const { lotteryType, lotterySearch } = useLotteryType();
  const [state, setState] = useState<{
    data: UserExpectListItem[];
    loading: boolean;
    error: string | null;
  }>({
    data: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    getUserExpects(lotteryType)
      .then((data) => {
        if (mounted) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((error: Error) => {
        if (mounted) {
          setState({ data: [], loading: false, error: error.message });
        }
      });

    return () => {
      mounted = false;
    };
  }, [lotteryType]);

  if (state.loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="brand__eyebrow">{LOTTERY_LABELS[lotteryType]}</span>
          <h1>我的结算记录</h1>
        </div>
      </header>

      <Panel title={`${LOTTERY_LABELS[lotteryType]}期数列表`}>
        {state.error ? <p className="error-text">{state.error}</p> : null}
        <div className="list-grid">
          {state.data.map((item) => (
            <Link className="expect-card" key={item.expect} to={`/expects/${item.expect}${lotterySearch}`}>
              <strong>{item.expect}期</strong>
              <span>快照时间：{formatDateTime(item.receivedAt)}</span>
              <span>{item.hasDrawResult ? "已开奖" : "待开奖"}</span>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
