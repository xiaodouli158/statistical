import { DEFAULT_PING_TE_ODDS, DEFAULT_PING_TE_TAIL_ODDS, DEFAULT_TEMA_DIRECT_ODDS } from "@statisticalsystem/shared";
import type { OddsConfig, OddsConfigInput, PlayType } from "../types";

export const DEFAULT_ODDS_CONFIG: OddsConfig = {
  temaDirect: DEFAULT_TEMA_DIRECT_ODDS,
  pingte: DEFAULT_PING_TE_ODDS,
  pingteTail: DEFAULT_PING_TE_TAIL_ODDS
};

function normalizeOddsValue(input: number | undefined, fallback: number): number {
  if (typeof input !== "number" || !Number.isFinite(input) || input <= 0) {
    return fallback;
  }

  return input;
}

export function resolveOddsConfig(input?: OddsConfigInput): OddsConfig {
  return {
    temaDirect: normalizeOddsValue(input?.temaDirect, DEFAULT_ODDS_CONFIG.temaDirect),
    pingte: normalizeOddsValue(input?.pingte, DEFAULT_ODDS_CONFIG.pingte),
    pingteTail: normalizeOddsValue(input?.pingteTail, DEFAULT_ODDS_CONFIG.pingteTail)
  };
}

export function getOddsForPlayType(playType: PlayType, config: OddsConfig): number {
  switch (playType) {
    case "平特":
      return config.pingte;
    case "平特尾数":
      return config.pingteTail;
    case "特码直投":
    default:
      return config.temaDirect;
  }
}
