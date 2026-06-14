"use client";

import { CLANS, type ClanId } from "@/lib/clan-config";
import { formatEthPerClanMember } from "@/lib/clan-stats";
import { ClanAverageFace } from "./ClanAverageFace";
import { ClanEditDistanceBar } from "./ClanEditDistanceBar";

type ClanPanelProps = {
  clan: ClanId;
  fighterIds: number[];
  avgEditDistance: number;
  isLeading: boolean;
  members: number;
  potWei?: bigint;
  selected: boolean;
  onSelect: () => void;
};

export function ClanPanel({
  clan,
  fighterIds,
  avgEditDistance,
  isLeading,
  members,
  potWei,
  selected,
  onSelect,
}: ClanPanelProps) {
  const c = CLANS[clan];
  const isRed = clan === "red";
  const sharePerFighter =
    isLeading && members > 0 ? formatEthPerClanMember(potWei, members) : null;

  const borderSelected = isRed
    ? "border-rose-400 shadow-[0_0_0_1px_rgba(251,113,133,0.45),0_0_28px_rgba(244,63,94,0.28),0_0_8px_rgba(244,63,94,0.15)] ring-2 ring-rose-500/30"
    : "border-blue-400 shadow-[0_0_0_1px_rgba(96,165,250,0.45),0_0_28px_rgba(59,130,246,0.28),0_0_8px_rgba(59,130,246,0.15)] ring-2 ring-blue-500/30";
  const borderIdle = "border-zinc-200 hover:border-zinc-300 hover:shadow-sm";
  const accentBorder = isRed ? "border-rose-500" : "border-blue-500";
  const nameColor = isRed ? "text-rose-600" : "text-blue-600";
  const dotColor = isRed ? "bg-rose-500" : "bg-blue-500";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`relative flex w-full flex-col overflow-hidden rounded-2xl border bg-white text-left transition-all ${
        selected ? borderSelected : borderIdle
      }`}
    >
      <div
        className={`flex justify-center border-b-4 ${accentBorder} bg-zinc-50 px-4 py-5`}
      >
        <ClanAverageFace clan={clan} fighterIds={fighterIds} layout="hero" />
      </div>

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={`text-xs font-bold uppercase tracking-wide ${nameColor}`}
          >
            {c.label}
          </span>
          <span className={`h-2 w-2 rounded-full ${dotColor}`} aria-hidden />
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            {members} normie{members === 1 ? "" : "s"}
          </span>
          {isLeading && members > 0 && (
            <div className="ml-auto text-right">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-700">
                Leading
              </span>
              {sharePerFighter != null && (
                <p className="mt-0.5 text-[10px] font-medium text-emerald-600">
                  Current Share Estimate:{" "}
                  <span className="font-mono tabular-nums">
                    {sharePerFighter} ETH
                  </span>{" "}
                  / Normie
                </p>
              )}
            </div>
          )}
        </div>

        <ClanEditDistanceBar
          clan={clan}
          avgEditDistance={avgEditDistance}
          variant="panel"
        />
      </div>
    </button>
  );
}
