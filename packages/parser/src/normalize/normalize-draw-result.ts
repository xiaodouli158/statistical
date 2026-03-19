import type { DrawResultRecord, WaveColor } from "@statisticalsystem/shared";
import { WAVE_COLORS, getSpecialDrawNumber, getSpecialDrawWave, getSpecialDrawZodiac } from "@statisticalsystem/shared";
import type { NormalizedDrawResult } from "../types";
import { normalizeNumberToken } from "../utils/text";
import { normalizeZodiacName } from "../utils/zodiac";

function normalizeWave(input: string): WaveColor[] {
  return input
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is WaveColor => WAVE_COLORS.includes(item as WaveColor));
}

export function normalizeDrawResult(drawResult: DrawResultRecord | null): NormalizedDrawResult | null {
  if (!drawResult) {
    return null;
  }

  const numbers = drawResult.openCode
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map(normalizeNumberToken);

  const zodiacs = drawResult.zodiac
    .split(",")
    .map((item) => normalizeZodiacName(item))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const waves = normalizeWave(drawResult.wave);

  return {
    expect: drawResult.expect,
    openTime: drawResult.openTime,
    type: drawResult.type,
    numbers,
    waves,
    zodiacs,
    specialNumber: getSpecialDrawNumber(numbers),
    specialWave: getSpecialDrawWave(waves),
    specialZodiac: getSpecialDrawZodiac(zodiacs),
    verify: drawResult.verify,
    raw: drawResult
  };
}
