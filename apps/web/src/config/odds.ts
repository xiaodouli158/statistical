import { resolveOddsConfig } from "@statisticalsystem/parser";

function parseOddsValue(input: string | undefined): number | undefined {
  if (!input) {
    return undefined;
  }

  const value = Number(input);

  if (!Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return value;
}

export const ORDER_ODDS_CONFIG = resolveOddsConfig({
  temaDirect: parseOddsValue(import.meta.env.VITE_ODDS_TEMA_DIRECT),
  pingte: parseOddsValue(import.meta.env.VITE_ODDS_PING_TE),
  pingteTail: parseOddsValue(import.meta.env.VITE_ODDS_PING_TE_TAIL)
});
