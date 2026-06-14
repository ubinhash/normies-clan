"use client";

import { GENDERS, type GenderLabel, type MedoidResult } from "@/lib/hamming";
import type { PixelsMap } from "@/lib/types";
import { NormiePixel } from "./NormiePixel";

const API_IMG = (id: number) =>
  `https://api.normies.art/normie/${id}/original/image.svg`;

const GENDER_LABEL: Record<GenderLabel, string> = {
  Male: "Male",
  Female: "Female",
  "Non-Binary": "Non-binary",
};

type GenderMedoidsPanelProps = {
  medoids: Partial<Record<GenderLabel, MedoidResult>> | null;
  pixels: PixelsMap | null;
  onSelect: (tokenId: number) => void;
};

export function GenderMedoidsPanel({
  medoids,
  pixels,
  onSelect,
}: GenderMedoidsPanelProps) {
  return (
    <div className="w-[13.5rem] shrink-0 rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-sm backdrop-blur-sm">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
        By gender
      </p>
      <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">
        The most average Normie of each gender.
      </p>

      {!medoids && (
        <p className="mt-4 text-xs text-zinc-400">Loading gender medoids…</p>
      )}

      {medoids && (
        <ul className="mt-3 space-y-2">
          {GENDERS.map((gender) => {
            const entry = medoids[gender];
            if (!entry) return null;
            const bits = pixels?.[String(entry.tokenId)];

            return (
              <li key={gender}>
                <button
                  type="button"
                  onClick={() => onSelect(entry.tokenId)}
                  className="group flex w-full items-center gap-2.5 rounded-lg border border-zinc-100 p-2 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                >
                  <div className="shrink-0">
                    {bits ? (
                      <NormiePixel bits={bits} scale={2} className="rounded" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={API_IMG(entry.tokenId)}
                        alt=""
                        width={80}
                        height={80}
                        className="rounded image-pixelated"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                      {GENDER_LABEL[gender]}
                    </p>
                    <p className="font-mono text-xs text-zinc-700 group-hover:text-zinc-950">
                      #{entry.tokenId}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {entry.count.toLocaleString()} · avg Δ {entry.avgDistance}px
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
