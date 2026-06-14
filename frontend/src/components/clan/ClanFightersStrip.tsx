"use client";

import { CLANS, type ClanId } from "@/lib/clan-config";
import type { ClanMemberInfo } from "@/hooks/useClanWar";
import { shortenAddress } from "@/lib/normies-api";
import { NormieCard } from "./NormieCard";

type ClanFightersStripProps = {
  clan: ClanId;
  members: ClanMemberInfo[];
  connectedAddress?: string | null;
};

function isSameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** Compact enlisted roster — shown under clan row when a clan is selected. */
export function ClanFightersStrip({
  clan,
  members,
  connectedAddress,
}: ClanFightersStripProps) {
  if (members.length === 0) return null;

  const label = CLANS[clan].label;
  const border = clan === "red" ? "border-rose-200" : "border-blue-200";
  const youHighlight =
    clan === "red"
      ? "font-semibold text-rose-700"
      : "font-semibold text-blue-700";

  return (
    <div
      className={`mt-2 rounded-lg border ${border} bg-white/80 px-3 py-2`}
    >
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
        {label} · enlisted
      </p>
      <div className="flex flex-wrap gap-2">
        {members.map(({ tokenId, enlistedBy }) => {
          const isYou =
            connectedAddress != null &&
            isSameAddress(enlistedBy, connectedAddress);

          return (
            <div key={tokenId} className="flex flex-col items-center gap-1">
              <NormieCard
                tokenId={tokenId}
                size="sm"
                disabled
                onSelect={() => {}}
              />
              <span
                className={`max-w-[72px] truncate font-mono text-[9px] leading-tight ${
                  isYou ? youHighlight : "text-zinc-400"
                }`}
                title={enlistedBy}
              >
                {isYou ? "You · " : ""}
                {shortenAddress(enlistedBy)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
