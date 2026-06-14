import type { ClanId } from "./clan-config";

/** Worst-case mean Hamming distance (40×40 = 1600 pixels). */
export const MAX_AVG_EDIT_DISTANCE = 1600;

/** Lower average edit distance = stronger clan (winner). */
export function getLeadingClan(
  avgDistances: Record<ClanId, number>,
): ClanId | null {
  const entries = (Object.entries(avgDistances) as [ClanId, number][]).filter(
    ([, d]) => d >= 0,
  );
  if (entries.length === 0) return null;
  return entries.reduce((a, b) => (a[1] <= b[1] ? a : b))[0];
}

/**
 * Health bar: 0 px avg → 100%, 1600 px avg → 0%.
 * Higher bar = tighter clan (lower average edit distance).
 */
export function cohesionHealthPercent(avgDistance: number): number {
  const clamped = Math.min(
    Math.max(avgDistance, 0),
    MAX_AVG_EDIT_DISTANCE,
  );
  return Math.round((1 - clamped / MAX_AVG_EDIT_DISTANCE) * 100);
}

/** Remaining cohesion points (inverse of avg distance). */
export function cohesionPoints(avgDistance: number): number {
  const clamped = Math.min(
    Math.max(avgDistance, 0),
    MAX_AVG_EDIT_DISTANCE,
  );
  return Math.round(MAX_AVG_EDIT_DISTANCE - clamped);
}

export function formatAvgEditDistance(px: number): string {
  return Math.round(px).toLocaleString();
}

/** Pot split per fighter if this clan wins; max 4 significant figures. */
export function formatEthPerClanMember(
  potWei: bigint | undefined,
  memberCount: number,
): string | null {
  if (potWei == null || memberCount <= 0) return null;
  const eth = Number(potWei) / 1e18 / memberCount;
  if (!Number.isFinite(eth) || eth <= 0) return "0";
  if (eth < 1e-6) return eth.toExponential(3);
  return Number(eth.toPrecision(4)).toString();
}

/** When contract exposes clan total distance + member count. */
export function avgEditDistance(totalPx: number, memberCount: number): number {
  if (memberCount <= 0) return 0;
  return totalPx / memberCount;
}
