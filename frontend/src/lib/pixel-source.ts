import type { PixelsMap } from "./types";

export type PixelSource = "original" | "customized";

/** Original pixels with customized canvas edits overlaid where available. */
export function mergePixelMaps(
  original: PixelsMap,
  customized: PixelsMap | null,
): PixelsMap {
  if (!customized || Object.keys(customized).length === 0) return original;
  return { ...original, ...customized };
}

export const PIXEL_SOURCE_LABEL: Record<PixelSource, string> = {
  original: "Original",
  customized: "Customized",
};

export const PIXEL_SOURCE_ACTIVE_CLASS: Record<PixelSource, string> = {
  original: "bg-zinc-900 text-white shadow-sm",
  customized: "bg-zinc-900 text-white shadow-sm",
};

export type SearchMode = "token" | "draw";

export const SEARCH_MODE_ACTIVE_CLASS: Record<SearchMode, string> = {
  token: "segment-active-token",
  draw: "segment-active-draw",
};

export const SEGMENT_INACTIVE_CLASS =
  "text-zinc-500 hover:bg-white/70 hover:text-zinc-800";
