import { mergePixelMaps } from "./pixel-source";
import type { PixelsMap } from "./types";

const PIXELS_URL = "/normies/pixels.json";
const PIXELS_DIFF_URL = "/normies/pixels-diff.json";

let originalCache: PixelsMap | null = null;
let originalLoadPromise: Promise<PixelsMap> | null = null;

let diffCache: PixelsMap | null = null;
let diffLoadPromise: Promise<PixelsMap> | null = null;

let customizedCache: PixelsMap | null = null;
let customizedLoadPromise: Promise<PixelsMap> | null = null;

export function loadPixelsMap(): Promise<PixelsMap> {
  if (originalCache) return Promise.resolve(originalCache);
  if (!originalLoadPromise) {
    originalLoadPromise = fetch(PIXELS_URL).then(async (res) => {
      if (!res.ok) throw new Error(`pixels.json: ${res.status}`);
      const data = (await res.json()) as PixelsMap;
      originalCache = data;
      return data;
    });
  }
  return originalLoadPromise;
}

export function loadPixelsDiffMap(): Promise<PixelsMap> {
  if (diffCache) return Promise.resolve(diffCache);
  if (!diffLoadPromise) {
    diffLoadPromise = fetch(PIXELS_DIFF_URL).then(async (res) => {
      if (!res.ok) throw new Error(`pixels-diff.json: ${res.status}`);
      const data = (await res.json()) as PixelsMap;
      diffCache = data;
      return data;
    });
  }
  return diffLoadPromise;
}

/** Original pixels with canvas edits overlaid where available. */
export function loadCustomizedPixelsMap(): Promise<PixelsMap> {
  if (customizedCache) return Promise.resolve(customizedCache);
  if (!customizedLoadPromise) {
    customizedLoadPromise = Promise.all([
      loadPixelsMap(),
      loadPixelsDiffMap(),
    ]).then(([original, diff]) => {
      customizedCache = mergePixelMaps(original, diff);
      return customizedCache;
    });
  }
  return customizedLoadPromise;
}

export function getPixelsForIds(
  map: PixelsMap,
  tokenIds: number[],
): { bits: string[]; found: number; total: number } {
  const bits: string[] = [];
  for (const id of tokenIds) {
    const s = map[String(id)];
    if (s) bits.push(s.trim());
  }
  return { bits, found: bits.length, total: tokenIds.length };
}
