import { useParams } from "react-router-dom";
import { LOTTERY_LABELS } from "@statisticalsystem/shared";
import { LoadingScreen } from "../../components/LoadingScreen";
import { ExpectDetailContent } from "../../features/expect-detail/components/ExpectDetailContent";
import { useExpectDetailQuery } from "../../features/expect-detail/hooks/useExpectDetailQuery";
import { useLotteryType } from "../../hooks/useLotteryType";
import { getUserExpectDetail } from "../../services/user";

export function ExpectDetailPage() {
  const { expect = "" } = useParams();
  const { lotteryType } = useLotteryType();
  const { data, loading, error } = useExpectDetailQuery(`${lotteryType}:${expect}`, () => getUserExpectDetail(expect, lotteryType));

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !data) {
    return (
      <div className="page-stack">
        <p className="error-text">{error ?? `${LOTTERY_LABELS[lotteryType]}数据不存在`}</p>
      </div>
    );
  }

  return <ExpectDetailContent data={data} />;
}
