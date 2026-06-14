"use client";

import { useState } from "react";
import type { SimilarNormie } from "@/lib/hamming";
import { GENDERS } from "@/lib/hamming";
import { NORMIE_TYPES } from "@/lib/traits";
import type { PixelsMap } from "@/lib/types";
import type { NormieTraitEntry } from "@/lib/types";
import { NormieTraitsPanel } from "./NormieTraitsPanel";
import { OpenSeaLink } from "./OpenSeaLink";
import { NormiePixel } from "./NormiePixel";
import {
  DiffProfileLegendIcon,
  NormiePixelDiffWithProfile,
} from "./NormiePixelDiffWithProfile";
import {
  DIFF_ARROW_HIT_PAD,
  DIFF_ARROW_ROOM,
  DIFF_AXIS_PAD,
  DIFF_BAR_MAX,
} from "./NormiePixelDiffWithProfile";

const API_IMG = (id: number) =>
  `https://api.normies.art/normie/${id}/original/image.svg`;

const THUMB_SCALE = 3;
const THUMB_PX = 40 * THUMB_SCALE;
const DIFF_CHART_PAD = DIFF_BAR_MAX + DIFF_AXIS_PAD;
const DIFF_FRAME = THUMB_PX + DIFF_CHART_PAD + DIFF_ARROW_ROOM + DIFF_ARROW_HIT_PAD;

const FILTER_SELECT_CLASS =
  "rounded-full border border-zinc-200 bg-white py-1.5 pl-3 pr-8 text-xs text-zinc-800 outline-none focus:border-zinc-400";

const TOGGLE_BTN_CLASS =
  "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:text-sm";

type SimilarNormiesProps = {
  sourceTokenId?: number | null;
  sourceTitle?: string;
  sourceBits: string | null;
  sourceTraits?: NormieTraitEntry | null;
  traitsLoading?: boolean;
  similar: SimilarNormie[];
  pixels: PixelsMap | null;
  loading?: boolean;
  typeFilter: string;
  genderFilter: string;
  hasActiveFilters: boolean;
  onTypeFilterChange: (value: string) => void;
  onGenderFilterChange: (value: string) => void;
  onSelect: (tokenId: number) => void;
};

export function SimilarNormies({
  sourceTokenId,
  sourceTitle,
  sourceBits,
  sourceTraits,
  traitsLoading,
  similar,
  pixels,
  loading,
  typeFilter,
  genderFilter,
  hasActiveFilters,
  onTypeFilterChange,
  onGenderFilterChange,
  onSelect,
}: SimilarNormiesProps) {
  const [showDiff, setShowDiff] = useState(false);
  const isCustom = sourceTokenId == null;
  const heading =
    sourceTitle ?? (sourceTokenId != null ? `Normie #${sourceTokenId}` : "Query");
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="border-b border-zinc-100 pb-5">
        <div className="flex flex-col items-center text-center">
          <h2 className="font-serif text-lg text-zinc-950 sm:text-xl">{heading}</h2>
          {isCustom && (
            <p className="mt-0.5 text-xs text-zinc-500">Custom drawing</p>
          )}
          {!isCustom && sourceTokenId != null && (
            <OpenSeaLink tokenId={sourceTokenId} className="mt-1 inline-flex" />
          )}
        </div>

        <div className="mx-auto mt-4 w-full max-w-4xl">
          <div className="flex items-center justify-center gap-6 lg:gap-8">
            {!isCustom && (
              <div className="hidden flex-1 justify-end lg:flex">
                <NormieTraitsPanel
                  traits={sourceTraits}
                  loading={traitsLoading}
                  side="left"
                />
              </div>
            )}

            <div className="shrink-0">
              {sourceBits ? (
                <NormiePixel
                  bits={sourceBits}
                  scale={4}
                  className="rounded border border-zinc-200"
                />
              ) : sourceTokenId != null ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={API_IMG(sourceTokenId)}
                  alt={`Normie ${sourceTokenId}`}
                  width={200}
                  height={200}
                  className="rounded border border-zinc-200 image-pixelated"
                />
              ) : null}
            </div>

            {!isCustom && (
              <div className="hidden flex-1 justify-start lg:flex">
                <NormieTraitsPanel
                  traits={sourceTraits}
                  loading={traitsLoading}
                  side="right"
                />
              </div>
            )}
          </div>

          {!isCustom && (
            <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-6 sm:max-w-lg sm:gap-8 lg:hidden">
              <NormieTraitsPanel
                traits={sourceTraits}
                loading={traitsLoading}
                side="left"
              />
              <NormieTraitsPanel
                traits={sourceTraits}
                loading={traitsLoading}
                side="right"
              />
            </div>
          )}
        </div>
      </div>

      <div className="pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-medium text-zinc-700">10 most similar</h3>
            <p className="text-xs text-zinc-500">
              Closest by pixel edit distance (Hamming) across the collection
              {hasActiveFilters ? " · filtered" : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 p-0.5"
              role="tablist"
              aria-label="Diff overlay"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!showDiff}
                disabled={!sourceBits}
                onClick={() => setShowDiff(false)}
                className={`${TOGGLE_BTN_CLASS} ${
                  !showDiff
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "segment-inactive"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Hide diff
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={showDiff}
                disabled={!sourceBits}
                onClick={() => setShowDiff(true)}
                className={`${TOGGLE_BTN_CLASS} ${
                  showDiff
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "segment-inactive"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Show diff
              </button>
            </div>

            <label className="flex items-center gap-1.5 text-xs text-zinc-500">
              Type
              <select
                value={typeFilter}
                onChange={(e) => onTypeFilterChange(e.target.value)}
                className={FILTER_SELECT_CLASS}
                aria-label="Filter by type"
              >
                <option value="">All</option>
                {NORMIE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-zinc-500">
              Gender
              <select
                value={genderFilter}
                onChange={(e) => onGenderFilterChange(e.target.value)}
                className={FILTER_SELECT_CLASS}
                aria-label="Filter by gender"
              >
                <option value="">All</option>
                {GENDERS.map((gender) => (
                  <option key={gender} value={gender}>
                    {gender}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {loading && (
          <p className="mt-3 text-sm text-zinc-500">Computing similarities…</p>
        )}

        {!loading && similar.length === 0 && (
          <p className="mt-3 text-sm text-zinc-500">
            {hasActiveFilters
              ? "No Normies match these filters."
              : isCustom
                ? "No similar Normies found."
                : "No pixel data for this token — cannot compare."}
          </p>
        )}

        {!loading && similar.length > 0 && (
          <>
            {showDiff && sourceBits ? (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: "#f87171" }}
                  />
                  Missing vs query
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: "#60a5fa" }}
                  />
                  Extra vs query
                </span>
                <span className="text-zinc-400">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <DiffProfileLegendIcon className="shrink-0" />
                  gray bars = row (left) &amp; col (top) diff count
                </span>
              </div>
            ) : null}

            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 min-[1280px]:grid-cols-10">
              {similar.map(({ tokenId, distance }) => {
                const bits = pixels?.[String(tokenId)];
                const showDiffView = showDiff && sourceBits && bits;

                return (
                  <li key={tokenId} className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => onSelect(tokenId)}
                      className={`flex w-full flex-col items-center gap-1.5 rounded-lg p-2 transition-colors hover:bg-zinc-50 ${
                        showDiffView ? "max-w-[10.75rem]" : "max-w-[9.5rem]"
                      }`}
                    >
                      <div
                        className={
                          showDiffView
                            ? "flex items-start justify-start overflow-visible"
                            : "flex items-center justify-center"
                        }
                        style={{
                          width: showDiffView ? DIFF_FRAME : THUMB_PX,
                          height: showDiffView ? DIFF_FRAME : THUMB_PX,
                        }}
                      >
                        {showDiffView ? (
                          <NormiePixelDiffWithProfile
                            queryBits={sourceBits}
                            bits={bits}
                            scale={THUMB_SCALE}
                          />
                        ) : bits ? (
                          <NormiePixel bits={bits} scale={THUMB_SCALE} />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={API_IMG(tokenId)}
                            alt={`Normie ${tokenId}`}
                            width={THUMB_PX}
                            height={THUMB_PX}
                            className="image-pixelated"
                          />
                        )}
                      </div>
                      <span className="text-sm font-medium">#{tokenId}</span>
                      <span className="text-xs text-zinc-500">Δ {distance} px</span>
                      <OpenSeaLink
                        tokenId={tokenId}
                        onClick={(e) => e.stopPropagation()}
                        iconClassName="h-3.5 w-3.5"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
