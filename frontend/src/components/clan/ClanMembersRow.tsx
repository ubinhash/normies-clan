"use client";

import { useEffect, useMemo, useState } from "react";
import { CLANS, NORMIE_IMG, type ClanId } from "@/lib/clan-config";
import type { ClanMemberInfo } from "@/hooks/useClanWar";
import { shortenAddress } from "@/lib/normies-api";

type ClanMembersRowProps = {
  clan: ClanId;
  members: ClanMemberInfo[];
  connectedAddress?: string | null;
  connected?: boolean;
  joinOpen?: boolean;
  evictFeeEth?: string;
  evictPending?: boolean;
  evictPendingTokenId?: number | null;
  onEvict?: (tokenId: number) => void;
};

function isSameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export function ClanMembersRow({
  clan,
  members,
  connectedAddress,
  connected = false,
  joinOpen = false,
  evictFeeEth = "…",
  evictPending = false,
  evictPendingTokenId = null,
  onEvict,
}: ClanMembersRowProps) {
  const [confirmTokenId, setConfirmTokenId] = useState<number | null>(null);
  const isRed = clan === "red";
  const border = isRed ? "border-rose-200" : "border-blue-200";
  const borderActive = isRed ? "border-rose-400" : "border-blue-400";
  const idColor = isRed ? "text-rose-600" : "text-blue-600";
  const label = CLANS[clan].label.toUpperCase();
  const canEvict = connected && joinOpen && members.length >= 4 && onEvict;

  useEffect(() => {
    if (
      confirmTokenId != null &&
      !members.some((m) => m.tokenId === confirmTokenId)
    ) {
      setConfirmTokenId(null);
    }
  }, [members, confirmTokenId]);

  return (
    <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
          {label} members ({members.length})
        </p>
        {canEvict && (
          <p className="text-[9px] text-zinc-400">
            Tap a normie to evict · {evictFeeEth} ETH
          </p>
        )}
      </div>
      {members.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-400">No normies enlisted yet.</p>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap gap-2">
            {members.map(({ tokenId, enlistedBy }) => {
              const isYou =
                connectedAddress != null &&
                isSameAddress(enlistedBy, connectedAddress);
              const isConfirming = confirmTokenId === tokenId;
              const isPending =
                evictPending && evictPendingTokenId === tokenId;
              const clickable = Boolean(canEvict) && !evictPending;

              return (
                <button
                  key={tokenId}
                  type="button"
                  disabled={!clickable}
                  onClick={() => {
                    if (!clickable) return;
                    setConfirmTokenId(isConfirming ? null : tokenId);
                  }}
                  className={`flex w-[72px] flex-col items-center gap-1 rounded-lg border bg-zinc-50 p-1.5 transition-all ${
                    isConfirming || isPending
                      ? `${borderActive} ring-1 ${isRed ? "ring-rose-200" : "ring-blue-200"}`
                      : border
                  } ${
                    clickable
                      ? "cursor-pointer hover:border-zinc-400 hover:shadow-sm"
                      : "cursor-default"
                  } ${isPending ? "opacity-60" : ""}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={NORMIE_IMG(tokenId)}
                    alt=""
                    width={56}
                    height={56}
                    className="rounded image-pixelated bg-[#e3e5e4]"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <span
                    className={`font-mono text-[10px] font-medium ${idColor}`}
                  >
                    #{tokenId}
                  </span>
                  <span
                    className={`max-w-full truncate font-mono text-[8px] leading-tight ${
                      isYou
                        ? isRed
                          ? "font-semibold text-rose-700"
                          : "font-semibold text-blue-700"
                        : "text-zinc-400"
                    }`}
                    title={enlistedBy}
                  >
                    {isYou ? "You" : shortenAddress(enlistedBy)}
                  </span>
                </button>
              );
            })}
          </div>

          {confirmTokenId != null && canEvict && (
            <div
              className={`mt-3 rounded-lg border px-3 py-2.5 ${
                isRed
                  ? "border-rose-200 bg-rose-50/60"
                  : "border-blue-200 bg-blue-50/60"
              }`}
            >
              <p className="text-xs text-zinc-700">
                Evict{" "}
                <span className="font-mono font-medium">#{confirmTokenId}</span>{" "}
                from {CLANS[clan].label}?
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Costs {evictFeeEth} ETH (2× join fee). Half goes to the war
                chest, half to the enlistee.
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Evicting does not earn you a war chest share — only normies
                still enlisted in the winning clan when the round resolves qualify.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={evictPending}
                  onClick={() => {
                    onEvict?.(confirmTokenId);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium text-white ${
                    isRed
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  } disabled:opacity-50`}
                >
                  {evictPending ? "Confirm in wallet…" : "Confirm evict"}
                </button>
                <button
                  type="button"
                  disabled={evictPending}
                  onClick={() => setConfirmTokenId(null)}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {connected && joinOpen && members.length > 0 && members.length < 4 && (
            <p className="mt-2 text-[10px] text-zinc-400">
              Need at least 4 normies to evict (3 must remain).
            </p>
          )}
        </>
      )}
    </div>
  );
}
