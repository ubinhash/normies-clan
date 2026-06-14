"use client";

import { CLANS, type ClanId } from "@/lib/clan-config";
import { NormieCard } from "./NormieCard";

type ClanFightersRosterProps = {
  clan: ClanId;
  fighterIds: number[];
  selectedTokenId: number | null;
};

export function ClanFightersRoster({
  clan,
  fighterIds,
  selectedTokenId,
}: ClanFightersRosterProps) {
  const label = CLANS[clan].label;
  const border =
    clan === "red" ? "border-rose-200" : "border-blue-200";
  const headerBg = clan === "red" ? "bg-rose-50/80" : "bg-blue-50/80";

  return (
    <section
      className={`mt-6 overflow-hidden rounded-2xl border ${border} bg-white`}
    >
      <div
        className={`flex items-center justify-between border-b border-zinc-100 px-5 py-3 ${headerBg}`}
      >
        <h3 className="font-serif text-lg text-zinc-950">
          {label} normies
        </h3>
        <span className="font-mono text-sm text-zinc-500">
          {fighterIds.length}
        </span>
      </div>
      <div className="max-h-[min(420px,50vh)] overflow-y-auto p-5">
        <div className="flex flex-wrap gap-2">
          {fighterIds.map((id) => (
            <NormieCard
              key={id}
              tokenId={id}
              size="sm"
              selected={selectedTokenId === id}
              selectedClan={clan}
              disabled
              onSelect={() => {}}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
