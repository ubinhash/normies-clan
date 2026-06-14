export const PIXEL_COUNT = 40 * 40;

/** Per-pixel mean of 1-bits in [0, 1]. Not an on-chain Normie. */
export function computeSoftAverage(pixelStrings: string[]): number[] | null {
  const valid = pixelStrings.filter((s) => s.length === PIXEL_COUNT);
  if (valid.length === 0) return null;

  const sums = new Float64Array(PIXEL_COUNT);
  for (const bits of valid) {
    for (let i = 0; i < PIXEL_COUNT; i++) {
      if (bits[i] === "1") sums[i] += 1;
    }
  }

  const out = new Array<number>(PIXEL_COUNT);
  const n = valid.length;
  for (let i = 0; i < PIXEL_COUNT; i++) {
    out[i] = sums[i]! / n;
  }
  return out;
}

/** Binary prototype: pixel on when >= threshold of fighters have it on. */
export function computeHardConsensus(
  pixelStrings: string[],
  threshold = 0.5,
): string | null {
  const means = computeSoftAverage(pixelStrings);
  if (!means) return null;

  let bits = "";
  for (const mean of means) {
    bits += mean >= threshold ? "1" : "0";
  }
  return bits;
}

export type AverageFaceMode = "soft" | "hard";
