"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  topSimilarByHamming,
  topSimilarToPacked,
  type GenderLabel,
  type MedoidResult,
  type SimilarTraitFilters,
} from "@/lib/hamming";
import { packBits } from "@/lib/packed-pixels";
import {
  mergePixelMaps,
  type PixelSource,
  type SearchMode,
} from "@/lib/pixel-source";
import type { PixelsMap, TraitsMap } from "@/lib/types";
import { GenderMedoidsPanel } from "./GenderMedoidsPanel";
import { NormiePixel } from "./NormiePixel";
import { PixelGridDrawer } from "./PixelGridDrawer";
import { SimilarNormies } from "./SimilarNormies";

const TREE_URL = "/normies/tree.json";
const GENDER_MEDOIDS_URL = "/normies/gender_medoids.json";
const PIXELS_URL = "/normies/pixels.json";
const PIXELS_DIFF_URL = "/normies/pixels-diff.json";
const TRAITS_URL = "/normies/traits.json";
const API_IMG = (id: number) =>
  `https://api.normies.art/normie/${id}/original/image.svg`;

type LoadState = "loading" | "ready" | "error";

type TreeMeta = {
  medoid: number;
  count: number;
};

export function SimilarNormiesExplorer() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<TreeMeta | null>(null);
  const [pixels, setPixels] = useState<PixelsMap | null>(null);
  const [pixelsDiff, setPixelsDiff] = useState<PixelsMap | null>(null);
  const [pixelSource, setPixelSource] = useState<PixelSource>("original");
  const [pixelsDiffLoading, setPixelsDiffLoading] = useState(false);
  const [traits, setTraits] = useState<TraitsMap | null>(null);
  const [pixelsLoading, setPixelsLoading] = useState(false);
  const [traitsLoading, setTraitsLoading] = useState(false);
  const [genderMedoids, setGenderMedoids] = useState<Partial<
    Record<GenderLabel, MedoidResult>
  > | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [activeTokenId, setActiveTokenId] = useState<number | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>("token");
  const [drawnBits, setDrawnBits] = useState<string | null>(null);
  const [similarTypeFilter, setSimilarTypeFilter] = useState("");
  const [similarGenderFilter, setSimilarGenderFilter] = useState("");
  const drawResultsRef = useRef<HTMLDivElement>(null);

  const similarFilters = useMemo<SimilarTraitFilters>(() => {
    const filters: SimilarTraitFilters = {};
    if (similarTypeFilter) filters.type = similarTypeFilter;
    if (similarGenderFilter) filters.gender = similarGenderFilter;
    return filters;
  }, [similarTypeFilter, similarGenderFilter]);

  const hasSimilarFilters = Boolean(similarTypeFilter || similarGenderFilter);

  const scrollDownSmoothly = useCallback((offset = 120) => {
    window.requestAnimationFrame(() => {
      window.scrollBy({ top: offset, behavior: "smooth" });
    });
  }, []);

  const scrollToDrawResults = useCallback(() => {
    window.requestAnimationFrame(() => {
      drawResultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [treeRes, genderRes] = await Promise.all([
          fetch(TREE_URL),
          fetch(GENDER_MEDOIDS_URL),
        ]);
        if (!treeRes.ok) throw new Error(`tree.json: ${treeRes.status}`);
        const data = (await treeRes.json()) as { medoid: number; count: number };
        if (cancelled) return;
        setMeta({ medoid: data.medoid, count: data.count });
        setActiveTokenId(data.medoid);
        setSearchInput(String(data.medoid));
        if (genderRes.ok) {
          const genderData = (await genderRes.json()) as {
            medoids: Partial<Record<GenderLabel, MedoidResult>>;
          };
          if (!cancelled) setGenderMedoids(genderData.medoids);
        }
        setLoadState("ready");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load data");
          setLoadState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadPixels = useCallback(async () => {
    if (pixels || pixelsLoading) return pixels;
    setPixelsLoading(true);
    try {
      const res = await fetch(PIXELS_URL);
      if (!res.ok) throw new Error(`pixels.json: ${res.status}`);
      const data = (await res.json()) as PixelsMap;
      setPixels(data);
      return data;
    } finally {
      setPixelsLoading(false);
    }
  }, [pixels, pixelsLoading]);

  const loadTraits = useCallback(async () => {
    if (traits || traitsLoading) return traits;
    setTraitsLoading(true);
    try {
      const res = await fetch(TRAITS_URL);
      if (!res.ok) throw new Error(`traits.json: ${res.status}`);
      const data = (await res.json()) as TraitsMap;
      setTraits(data);
      return data;
    } finally {
      setTraitsLoading(false);
    }
  }, [traits, traitsLoading]);

  const loadPixelsDiff = useCallback(async () => {
    if (pixelsDiff || pixelsDiffLoading) return pixelsDiff;
    setPixelsDiffLoading(true);
    try {
      const res = await fetch(PIXELS_DIFF_URL);
      if (!res.ok) throw new Error(`pixels-diff.json: ${res.status}`);
      const data = (await res.json()) as PixelsMap;
      setPixelsDiff(data);
      return data;
    } finally {
      setPixelsDiffLoading(false);
    }
  }, [pixelsDiff, pixelsDiffLoading]);

  useEffect(() => {
    if (loadState === "ready") {
      void loadPixels();
      void loadTraits();
    }
  }, [loadState, loadPixels, loadTraits]);

  useEffect(() => {
    if (pixelSource === "customized") {
      void loadPixelsDiff();
    }
  }, [pixelSource, loadPixelsDiff]);

  const searchPixels = useMemo(() => {
    if (!pixels) return null;
    if (pixelSource === "original") return pixels;
    return mergePixelMaps(pixels, pixelsDiff);
  }, [pixels, pixelsDiff, pixelSource]);

  const pixelsLoadingForSearch =
    pixelsLoading && !pixels
      ? true
      : pixelSource === "customized" && pixelsDiffLoading && !pixelsDiff;

  const candidateIds = useMemo(() => {
    if (!searchPixels) return [];
    return Object.keys(searchPixels)
      .map((k) => parseInt(k, 10))
      .filter((id) => !Number.isNaN(id));
  }, [searchPixels]);

  const packedPixels = useMemo(() => {
    if (!searchPixels) return null;
    const map = new Map<number, Uint8Array>();
    for (const [key, bits] of Object.entries(searchPixels)) {
      const id = parseInt(key, 10);
      if (!Number.isNaN(id)) map.set(id, packBits(bits));
    }
    return map;
  }, [searchPixels]);

  const similar = useMemo(() => {
    if (activeTokenId == null || !searchPixels) return [];
    return topSimilarByHamming(
      searchPixels,
      activeTokenId,
      candidateIds,
      10,
      traits,
      similarFilters,
    );
  }, [activeTokenId, searchPixels, candidateIds, traits, similarFilters]);

  const drawSimilar = useMemo(() => {
    if (!drawnBits || !packedPixels) return [];
    return topSimilarToPacked(
      packedPixels,
      packBits(drawnBits),
      10,
      traits,
      similarFilters,
    );
  }, [drawnBits, packedPixels, traits, similarFilters]);

  const activeBits =
    activeTokenId != null ? searchPixels?.[String(activeTokenId)] ?? null : null;
  const activeTraits =
    activeTokenId != null ? traits?.[String(activeTokenId)] ?? null : null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(searchInput.trim(), 10);
    if (Number.isNaN(id) || id < 0 || id > 9999) {
      setError("Enter a valid token ID (0–9999)");
      return;
    }
    if (!searchPixels?.[String(id)]) {
      setError(`Token #${id} not in local pixel data`);
      return;
    }
    setError(null);
    setSearchMode("token");
    setActiveTokenId(id);
  };

  const handleDrawPreload = useCallback(() => {
    setDrawnBits(null);
  }, []);

  const handleDrawSearch = useCallback(
    (bits: string) => {
      setSearchMode("draw");
      setDrawnBits(bits);
      setError(null);
      window.setTimeout(() => scrollToDrawResults(), 80);
    },
    [scrollToDrawResults],
  );

  const switchPixelSource = useCallback((source: PixelSource) => {
    setPixelSource(source);
    setError(null);
  }, []);

  const handleSelect = useCallback((tokenId: number) => {
    setSearchMode("token");
    setActiveTokenId(tokenId);
    setSearchInput(String(tokenId));
    setError(null);
  }, []);

  const switchMode = useCallback((mode: SearchMode) => {
    setSearchMode(mode);
    setError(null);
  }, []);

  if (loadState === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-zinc-500">
        Loading…
      </div>
    );
  }

  if (loadState === "error" || !meta) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 text-red-600">
        {error ?? "Failed to load"}
      </div>
    );
  }

  const medoidBits = searchPixels?.[String(meta.medoid)] ?? null;

  const medoidCard = (
    <div className="w-[13.5rem] shrink-0 rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-sm backdrop-blur-sm">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
        Most average Normie
      </p>
      <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">
        The Normie that&apos;s closest to every other Normie in pixel distance, on average.
      </p>

      <button
        type="button"
        onClick={() => handleSelect(meta.medoid)}
        className="group mt-3 w-full cursor-pointer"
      >
        <div className="flex justify-center">
          {medoidBits ? (
            <NormiePixel bits={medoidBits} scale={3} className="rounded" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={API_IMG(meta.medoid)}
              alt={`Normie ${meta.medoid}`}
              width={120}
              height={120}
              className="rounded image-pixelated"
            />
          )}
        </div>
        <p className="mt-2 text-center font-mono text-xs text-zinc-600 group-hover:text-zinc-950">
          #{meta.medoid}
        </p>
      </button>
    </div>
  );

  const sidebar = (
    <div className="flex w-[13.5rem] shrink-0 flex-col gap-4">
      {medoidCard}
      <GenderMedoidsPanel
        medoids={genderMedoids}
        pixels={searchPixels}
        onSelect={handleSelect}
      />
    </div>
  );

  return (
    <div className="relative w-full flex-1 px-6 py-6 sm:px-8 lg:px-12">
      <aside className="absolute right-6 top-6 z-10 hidden sm:block lg:right-12">
        {sidebar}
      </aside>

      <div className="sm:pr-[15.5rem]">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <h1 className="font-serif text-2xl tracking-tight text-zinc-950 sm:text-3xl">
            Similar Normies
          </h1>
          <p className="mt-1 max-w-md text-xs text-zinc-500 sm:text-sm">
            {searchMode === "token"
              ? "Find similar normies by pixel edit distance."
              : "Paint a custom 40×40 grid and find the closest Normies."}
          </p>

          <aside className="mt-4 sm:hidden">{sidebar}</aside>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <div
              className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 p-0.5"
              role="tablist"
              aria-label="Pixel source"
            >
              <button
                type="button"
                role="tab"
                aria-selected={pixelSource === "original"}
                onClick={() => switchPixelSource("original")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:text-sm ${
                  pixelSource === "original"
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "segment-inactive"
                }`}
              >
                Original
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={pixelSource === "customized"}
                onClick={() => switchPixelSource("customized")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:text-sm ${
                  pixelSource === "customized"
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "segment-inactive"
                }`}
              >
                Customized
              </button>
            </div>

            <div
              className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 p-0.5"
              role="tablist"
              aria-label="Search mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={searchMode === "token"}
                onClick={() => switchMode("token")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:text-sm ${
                  searchMode === "token"
                    ? "segment-active-token"
                    : "segment-inactive"
                }`}
              >
                Token ID
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={searchMode === "draw"}
                onClick={() => switchMode("draw")}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:text-sm ${
                  searchMode === "draw"
                    ? "segment-active-draw"
                    : "segment-inactive"
                }`}
              >
                Draw
              </button>
            </div>
          </div>

          {searchMode === "token" ? (
            <section className="mt-3 w-full">
              <form
                onSubmit={handleSearch}
                className="mx-auto flex w-full max-w-sm justify-center gap-2"
              >
                <input
                  type="number"
                  min={0}
                  max={9999}
                  placeholder="Token ID (0–9999)"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
                />
                <button type="submit" className="btn-primary shrink-0 px-4 py-2 text-sm">
                  Search
                </button>
              </form>
              {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
            </section>
          ) : (
            <section className="mt-3 w-full max-w-xl">
              <PixelGridDrawer
                disabled={!packedPixels || pixelsLoadingForSearch}
                searching={false}
                pixelSource={pixelSource}
                originalPixels={pixels}
                fallbackPixels={searchPixels}
                defaultPreloadId={activeTokenId}
                onPreload={handleDrawPreload}
                onLoadSuccess={() => scrollDownSmoothly(96)}
                onSearch={handleDrawSearch}
              />
              {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
            </section>
          )}
        </div>

        {searchMode === "token" && activeTokenId != null && (
          <div className="mx-auto mt-4 w-full max-w-5xl">
            <SimilarNormies
              sourceTokenId={activeTokenId}
              sourceBits={activeBits}
              sourceTraits={activeTraits}
              traitsLoading={traitsLoading && !traits}
              similar={similar}
              pixels={searchPixels}
              loading={pixelsLoadingForSearch}
              typeFilter={similarTypeFilter}
              genderFilter={similarGenderFilter}
              hasActiveFilters={hasSimilarFilters}
              onTypeFilterChange={setSimilarTypeFilter}
              onGenderFilterChange={setSimilarGenderFilter}
              onSelect={handleSelect}
            />
          </div>
        )}

        {searchMode === "draw" && drawnBits && (
          <div ref={drawResultsRef} className="mx-auto mt-4 w-full max-w-5xl scroll-mt-6">
            <SimilarNormies
              sourceTitle="Your drawing"
              sourceBits={drawnBits}
              similar={drawSimilar}
              pixels={searchPixels}
              loading={pixelsLoadingForSearch}
              typeFilter={similarTypeFilter}
              genderFilter={similarGenderFilter}
              hasActiveFilters={hasSimilarFilters}
              onTypeFilterChange={setSimilarTypeFilter}
              onGenderFilterChange={setSimilarGenderFilter}
              onSelect={handleSelect}
            />
          </div>
        )}
      </div>
    </div>
  );
}
