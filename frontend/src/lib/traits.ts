import type { NormieTraitEntry } from "./types";

export const TRAIT_TYPES_LEFT = [
  "Type",
  "Gender",
  "Age",
  "Hair Style",
] as const;

export const TRAIT_TYPES_RIGHT = [
  "Facial Feature",
  "Eyes",
  "Expression",
  "Accessory",
] as const;

export const NORMIE_TYPES = ["Agent", "Alien", "Cat", "Human"] as const;

export function traitValue(
  entry: NormieTraitEntry | undefined,
  traitType: string,
): string | null {
  if (!entry) return null;
  const value = entry[traitType];
  return typeof value === "string" ? value : null;
}
