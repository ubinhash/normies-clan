"use client";

import { NORMIE_IMG } from "@/lib/clan-config";
import type { ClanId } from "@/lib/clan-config";
import { OpenSeaLink } from "@/components/OpenSeaLink";

type NormieCardProps = {
  tokenId: number;
  selected?: boolean;
  selectedClan?: ClanId | null;
  onSelect: () => void;
  badge?: "yours" | "burn";
  size?: "sm" | "md";
  disabled?: boolean;
  enlistedClan?: ClanId | null;
};

export function NormieCard({
  tokenId,
  selected,
  selectedClan,
  onSelect,
  badge,
  size = "md",
  disabled = false,
  enlistedClan = null,
}: NormieCardProps) {
  const dim = size === "sm" ? 72 : 88;
  const ring =
    selected && selectedClan === "red"
      ? "border-rose-500 ring-1 ring-rose-200"
      : selected && selectedClan === "blue"
        ? "border-blue-500 ring-1 ring-blue-200"
        : selected
          ? "border-zinc-950 ring-1 ring-zinc-200"
          : disabled
            ? "border-zinc-100"
            : "border-zinc-200 hover:border-zinc-400";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`group relative flex flex-col items-center gap-2 rounded-xl border bg-white p-3 transition-all ${ring} ${
        disabled
          ? "cursor-not-allowed opacity-40"
          : "cursor-pointer"
      }`}
    >
      {badge && (
        <span
          className={`absolute right-1 top-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${
            badge === "burn"
              ? "border-zinc-300 bg-zinc-100 text-zinc-600"
              : "border-zinc-200 bg-white text-zinc-500"
          }`}
        >
          {badge === "burn" ? "pool" : "yours"}
        </span>
      )}
      {enlistedClan && (
        <span
          className={`absolute bottom-1 left-1 rounded px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white ${
            enlistedClan === "red" ? "bg-rose-600" : "bg-blue-600"
          }`}
        >
          {enlistedClan === "red" ? "red" : "blue"}
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={NORMIE_IMG(tokenId)}
        alt={`Normie ${tokenId}`}
        width={dim}
        height={dim}
        className="rounded-md bg-[#e3e5e4] image-pixelated"
        style={{ imageRendering: "pixelated" }}
      />
      <span className="font-mono text-xs text-zinc-500 group-hover:text-zinc-800">
        #{tokenId}
      </span>
      <OpenSeaLink
        tokenId={tokenId}
        onClick={(e) => e.stopPropagation()}
        iconClassName="h-3.5 w-3.5"
      />
    </button>
  );
}
