import { OpenSeaLink } from "@/components/OpenSeaLink";
import { NORMIE_IMG } from "@/lib/clan-config";

/** Decorative fighters for the hero — medoid + two well-known ids. */
const HERO_RED = 3115;
const HERO_BLUE = 42;

function FighterFrame({
  tokenId,
  clan,
}: {
  tokenId: number;
  clan: "red" | "blue";
}) {
  const accent = clan === "red" ? "border-l-rose-500" : "border-l-blue-600";
  const label = clan === "red" ? "Clan Red" : "Clan Blue";

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm ${accent} border-l-[3px]`}
    >
      <div className="flex items-center justify-center bg-[#e3e5e4] p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={NORMIE_IMG(tokenId)}
          alt=""
          width={120}
          height={120}
          className="image-pixelated"
          style={{ imageRendering: "pixelated" }}
        />
      </div>
      <div className="border-t border-zinc-100 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
          {label}
        </p>
        <p className="font-mono text-sm text-zinc-600">#{tokenId}</p>
        <OpenSeaLink
          tokenId={tokenId}
          className="mt-1 inline-flex"
          iconClassName="h-3.5 w-3.5"
        />
      </div>
    </div>
  );
}

export function ArenaIllustration() {
  return (
    <div className="relative w-full max-w-sm" aria-hidden>
      <div className="grid grid-cols-2 gap-5">
        <FighterFrame tokenId={HERO_RED} clan="red" />
        <FighterFrame tokenId={HERO_BLUE} clan="blue" />
      </div>
      <div
        className="pointer-events-none absolute left-1/2 top-[38%] z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white font-serif text-sm text-zinc-400 shadow-sm"
        aria-hidden
      >
        vs
      </div>
      <div className="mt-5 flex items-center justify-center gap-3 rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm text-zinc-500">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
        <span className="font-mono text-zinc-700">war chest</span>
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
      </div>
    </div>
  );
}
