import { useEffect, useState } from "react";
import { LOTTERY_LABELS, type UserExpectListItem } from "@statisticalsystem/shared";
import { LoadingScreen } from "../../components/LoadingScreen";
import { ExpectListPanel } from "../../features/expect-list/components/ExpectListPanel";
import { useLotteryType } from "../../hooks/useLotteryType";
import { getUserExpects } from "../../services/user";

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

      <ExpectListPanel
        title={`${LOTTERY_LABELS[lotteryType]}期数列表`}
        items={state.data}
        error={state.error}
        emptyText="暂无结算记录"
        buildHref={(item) => `/expects/${item.expect}${lotterySearch}`}
      />
    </div>
  );
}
