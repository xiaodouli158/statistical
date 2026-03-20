import { DEFAULT_LOTTERY_TYPE, normalizeLotteryType, type LotteryType } from "@statisticalsystem/shared";
import { useSearchParams } from "react-router-dom";

export function buildLotterySearch(lotteryType: LotteryType): string {
  if (lotteryType === DEFAULT_LOTTERY_TYPE) {
    return "";
  }

  const params = new URLSearchParams();
  params.set("lottery", lotteryType);
  return `?${params.toString()}`;
}

export function useLotteryType() {
  const [searchParams, setSearchParams] = useSearchParams();
  const lotteryType = normalizeLotteryType(searchParams.get("lottery"));

  function setLotteryType(value: LotteryType) {
    const nextParams = new URLSearchParams(searchParams);

    if (value === DEFAULT_LOTTERY_TYPE) {
      nextParams.delete("lottery");
    } else {
      nextParams.set("lottery", value);
    }

    setSearchParams(nextParams, { replace: true });
  }

  return {
    lotteryType,
    lotterySearch: buildLotterySearch(lotteryType),
    setLotteryType
  };
}
