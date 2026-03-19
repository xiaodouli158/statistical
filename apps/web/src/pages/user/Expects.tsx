import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { UserExpectListItem } from "@statisticalsystem/shared";
import { LoadingScreen } from "../../components/LoadingScreen";
import { Panel } from "../../components/Panel";
import { getUserExpects } from "../../services/user";
import { formatDateTime } from "../../utils/format";

export function ExpectsPage() {
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

    getUserExpects()
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
  }, []);

  if (state.loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="brand__eyebrow">历史期数</span>
          <h1>我的结算记录</h1>
        </div>
      </header>

      <Panel title="期数列表">
        {state.error ? <p className="error-text">{state.error}</p> : null}
        <div className="list-grid">
          {state.data.map((item) => (
            <Link className="expect-card" key={item.expect} to={`/expects/${item.expect}`}>
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
