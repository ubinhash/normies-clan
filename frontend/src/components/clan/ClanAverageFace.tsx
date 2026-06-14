"use client";

import { useState } from "react";
import { type ClanId } from "@/lib/clan-config";
import type { AverageFaceMode } from "@/lib/average-face";
import { useClanSoftAverage } from "@/hooks/useClanSoftAverage";
import { NormiePixel } from "@/components/NormiePixel";
import { NormieSoftAverage } from "./NormieSoftAverage";

type ClanAverageFaceProps = {
  clan: ClanId;
  fighterIds: number[];
  compact?: boolean;
  layout?: "horizontal" | "vertical" | "hero";
};

export function ClanAverageFace({
  clan,
  fighterIds,
  compact = false,
  layout = "horizontal",
}: ClanAverageFaceProps) {
  const [mode, setMode] = useState<AverageFaceMode>("soft");
  const { means, hardBits, loading, error } = useClanSoftAverage(fighterIds);
  const isHero = layout === "hero";
  const isVertical = layout === "vertical";
  const size = isHero ? 96 : isVertical ? 88 : compact ? 100 : 80;
  const scale = isHero ? 2.4 : isVertical ? 2.2 : compact ? 2.5 : 2;
  const accentActive =
    clan === "red" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700";

  const hasFace = mode === "soft" ? means != null : hardBits != null;

  const toggle = !loading && !error && hasFace && (
    <div
      className="flex rounded-md border border-zinc-200 bg-white p-0.5 text-[9px] font-medium"
      role="group"
      aria-label="Average face mode"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMode("soft");
        }}
        className={`rounded px-2 py-0.5 transition-colors ${
          mode === "soft" ? accentActive : "text-zinc-400 hover:text-zinc-600"
        }`}
      >
        Soft
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMode("hard");
        }}
        className={`rounded px-2 py-0.5 transition-colors ${
          mode === "hard" ? accentActive : "text-zinc-400 hover:text-zinc-600"
        }`}
      >
        Hard
      </button>
    </div>
  );

  const faceBox = (
    <div className="rounded-lg border border-zinc-200 bg-[#e3e5e4] p-1">
      {loading && (
        <div
          className="flex items-center justify-center bg-zinc-100 text-[10px] text-zinc-400"
          style={{ width: size, height: size }}
        >
          …
        </div>
      )}
      {!loading && error && (
        <div
          className="flex items-center justify-center bg-zinc-50 text-[9px] text-zinc-400"
          style={{ width: size, height: size }}
        >
          —
        </div>
      )}
      {!loading && !error && hasFace && mode === "soft" && means && (
        <NormieSoftAverage means={means} scale={scale} />
      )}
      {!loading && !error && hasFace && mode === "hard" && hardBits && (
        <NormiePixel bits={hardBits} scale={scale} />
      )}
      {!loading && !error && !hasFace && (
        <div
          className="flex items-center justify-center bg-zinc-50 text-[9px] text-zinc-400"
          style={{ width: size, height: size }}
        >
          —
        </div>
      )}
    </div>
  );

  if (isHero) {
    return (
      <div className="flex flex-col items-center gap-2">
        {toggle}
        {faceBox}
        <p
          className={`text-[10px] font-medium lowercase tracking-wide ${
            clan === "red" ? "text-rose-600/70" : "text-blue-600/70"
          }`}
        >
          average face
        </p>
      </div>
    );
  }

  if (isVertical) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
          Average face
        </p>
        {toggle}
        {faceBox}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-center">
      {faceBox}
      <p
        className={`mt-1.5 max-w-[104px] text-center text-[9px] leading-tight ${
          clan === "red" ? "text-rose-600/80" : "text-blue-600/80"
        }`}
      >
        Average face
      </p>
      {toggle && <div className="mt-1">{toggle}</div>}
    </div>
  );
}
