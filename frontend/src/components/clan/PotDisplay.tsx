type PotDisplayProps = {
  potEth: string;
  joinFeeEth: string;
  variant?: "banner" | "compact" | "card" | "sidebar";
};

export function PotDisplay({
  potEth,
  joinFeeEth,
  variant = "card",
}: PotDisplayProps) {
  if (variant === "sidebar") {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-5 text-center shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          War chest
        </p>
        <p className="mt-2 font-serif text-4xl leading-none tracking-tight">
          <span className="text-emerald-600">{potEth}</span>
          <span className="ml-1.5 font-sans text-base font-normal text-zinc-400">
            ETH
          </span>
        </p>
        <p className="mt-3 text-sm text-zinc-500">Winner takes all</p>
        <p className="mt-2 text-[11px] text-zinc-400">
          +{joinFeeEth} ETH per enlistment
        </p>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 rounded-lg border border-zinc-200/80 bg-white px-5 py-3 sm:gap-x-8 sm:px-6 sm:py-3.5">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
          War chest
        </span>
        <p className="font-serif text-2xl leading-none tracking-tight sm:text-3xl">
          <span className="text-emerald-600">{potEth}</span>
          <span className="ml-1.5 font-sans text-sm font-normal text-zinc-400">
            ETH
          </span>
        </p>
        <span className="hidden text-sm text-zinc-500 sm:inline">
          Winning clan splits the pot
        </span>
        <span className="text-xs font-medium text-emerald-600 sm:ml-auto">
          +{joinFeeEth} ETH / join
        </span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex flex-col items-center justify-center px-2 py-1 text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">
          War chest
        </p>
        <p className="font-serif text-2xl leading-tight tracking-tight text-emerald-600">
          {potEth}
          <span className="ml-1 font-sans text-xs font-normal text-zinc-400">
            ETH
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center rounded-2xl border border-zinc-200 bg-white px-6 py-4 text-center">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">
        War chest
      </p>
      <p className="font-serif mt-1 text-3xl tracking-tight text-emerald-600">
        {potEth}
        <span className="ml-1.5 font-sans text-sm font-normal text-zinc-400">
          ETH
        </span>
      </p>
      <p className="mt-2 max-w-xs text-xs leading-relaxed text-zinc-500">
        The clan with the lowest avg pixel distance wins and splits this pot.
      </p>
      <p className="mt-1 text-[11px] text-zinc-400">
        Join fee {joinFeeEth} ETH · added each enlistment
      </p>
    </div>
  );
}

function ClanPickDivider({ active }: { active?: boolean }) {
  return (
    <div
      className={`flex flex-row items-center justify-center gap-3 py-3 lg:flex-col lg:gap-2 lg:px-3 lg:py-0 ${
        active ? "text-amber-800" : "text-zinc-400"
      }`}
      aria-hidden
    >
      <span className="text-lg leading-none lg:hidden">←</span>
      <div className="flex flex-col items-center gap-1">
        <span
          className={`whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] ${
            active ? "text-amber-700" : "text-zinc-500"
          }`}
        >
          Pick a clan
        </span>
        <div className="hidden items-center gap-1.5 lg:flex">
          <span className="text-base leading-none">←</span>
          <span className="h-px w-6 bg-current opacity-30" />
          <span className="text-base leading-none">→</span>
        </div>
      </div>
      <span className="text-lg leading-none lg:hidden">→</span>
    </div>
  );
}

export { ClanPickDivider };
