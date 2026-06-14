import { hammingPacked, packBits } from "./packed-pixels";
import { traitValue } from "./traits";
import type { NormieTraitEntry } from "./types";

/** Hamming distance (pixel edit distance) between two equal-length bit strings. */
export function hamming(a: string, b: string): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) d++;
  }
  return d;
}

export type SimilarNormie = {
  tokenId: number;
  distance: number;
};

export type SimilarTraitFilters = {
  type?: string;
  gender?: string;
};

function matchesSimilarFilters(
  traits: Record<string, NormieTraitEntry> | null | undefined,
  tokenId: number,
  filters?: SimilarTraitFilters,
): boolean {
  if (!filters?.type && !filters?.gender) return true;
  if (!traits) return false;
  const entry = traits[String(tokenId)];
  if (filters.type && traitValue(entry, "Type") !== filters.type) return false;
  if (filters.gender && traitValue(entry, "Gender") !== filters.gender) {
    return false;
  }
  return true;
}

function takeFilteredSimilar(
  ranked: SimilarNormie[],
  traits: Record<string, NormieTraitEntry> | null | undefined,
  filters: SimilarTraitFilters | undefined,
  k: number,
): SimilarNormie[] {
  if (!filters?.type && !filters?.gender) return ranked.slice(0, k);
  const out: SimilarNormie[] = [];
  for (const item of ranked) {
    if (!matchesSimilarFilters(traits, item.tokenId, filters)) continue;
    out.push(item);
    if (out.length >= k) break;
  }
  return out;
}

/** `k` nearest normies by Hamming distance (excludes `tokenId`). */
export function topSimilarByHamming(
  pixels: Record<string, string>,
  tokenId: number,
  candidateIds: number[],
  k = 10,
  traits?: Record<string, NormieTraitEntry> | null,
  filters?: SimilarTraitFilters,
): SimilarNormie[] {
  const query = pixels[String(tokenId)];
  if (!query) return [];

  const ranked: SimilarNormie[] = [];
  for (const id of candidateIds) {
    if (id === tokenId) continue;
    const bits = pixels[String(id)];
    if (!bits) continue;
    ranked.push({ tokenId: id, distance: hamming(query, bits) });
  }

  ranked.sort((a, b) => a.distance - b.distance || a.tokenId - b.tokenId);
  return takeFilteredSimilar(ranked, traits, filters, k);
}

/** `k` nearest normies to an arbitrary 1600-bit query (e.g. a user drawing). */
export function topSimilarToPacked(
  packed: Map<number, Uint8Array>,
  query: Uint8Array,
  k = 10,
  traits?: Record<string, NormieTraitEntry> | null,
  filters?: SimilarTraitFilters,
): SimilarNormie[] {
  const ranked: SimilarNormie[] = [];
  for (const [tokenId, bits] of packed) {
    ranked.push({ tokenId, distance: hammingPacked(query, bits) });
  }
  ranked.sort((a, b) => a.distance - b.distance || a.tokenId - b.tokenId);
  return takeFilteredSimilar(ranked, traits, filters, k);
}

export const GENDERS = ["Male", "Female", "Non-Binary"] as const;
export type GenderLabel = (typeof GENDERS)[number];

export type MedoidResult = {
  tokenId: number;
  count: number;
  avgDistance: number;
};

/** Token with minimum total Hamming distance to all others in the set. */
export function computeMedoid(
  pixels: Record<string, string>,
  ids: number[],
): MedoidResult | null {
  if (ids.length === 0) return null;

  const packed: Uint8Array[] = [];
  const valid: number[] = [];
  for (const id of ids) {
    const bits = pixels[String(id)];
    if (!bits) continue;
    valid.push(id);
    packed.push(packBits(bits));
  }

  if (valid.length === 0) return null;
  if (valid.length === 1) {
    return { tokenId: valid[0]!, count: 1, avgDistance: 0 };
  }

  let bestIdx = 0;
  let bestSum = Number.POSITIVE_INFINITY;

  for (let i = 0; i < packed.length; i++) {
    let sum = 0;
    for (let j = 0; j < packed.length; j++) {
      if (i === j) continue;
      sum += hammingPacked(packed[i]!, packed[j]!);
    }
    if (sum < bestSum) {
      bestSum = sum;
      bestIdx = i;
    }
  }

  return {
    tokenId: valid[bestIdx]!,
    count: valid.length,
    avgDistance: Math.round(bestSum / (valid.length - 1)),
  };
}

export function computeGenderMedoids(
  pixels: Record<string, string>,
  traits: Record<string, { Gender?: string; [key: string]: unknown }>,
): Partial<Record<GenderLabel, MedoidResult>> {
  const byGender: Record<GenderLabel, number[]> = {
    Male: [],
    Female: [],
    "Non-Binary": [],
  };

  for (const key of Object.keys(pixels)) {
    const gender = traits[key]?.Gender;
    if (gender === "Male" || gender === "Female" || gender === "Non-Binary") {
      const id = parseInt(key, 10);
      if (!Number.isNaN(id)) byGender[gender].push(id);
    }
  }

  const out: Partial<Record<GenderLabel, MedoidResult>> = {};
  for (const gender of GENDERS) {
    const result = computeMedoid(pixels, byGender[gender]);
    if (result) out[gender] = result;
  }
  return out;
}
