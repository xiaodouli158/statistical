import { useEffect, useState } from "react";
import type { ExpectDetailResponse, LotteryType } from "@statisticalsystem/shared";
import { getUserExpectDetail } from "../../../services/user";

export function useExpectDetailQuery(expect: string, lotteryType: LotteryType) {
  const [state, setState] = useState<{
    data: ExpectDetailResponse | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;
    setState({ data: null, loading: true, error: null });

    getUserExpectDetail(expect, lotteryType)
      .then((data) => {
        if (mounted) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((error: Error) => {
        if (mounted) {
          setState({ data: null, loading: false, error: error.message });
        }
      });

    return () => {
      mounted = false;
    };
  }, [expect, lotteryType]);

  return state;
}
