import {
  cohesionHealthPercent,
  formatAvgEditDistance,
} from "@/lib/clan-stats";
import type { ClanId } from "@/lib/clan-config";

type ClanEditDistanceBarProps = {
  clan: ClanId;
  avgEditDistance: number;
  isLeading?: boolean;
  compact?: boolean;
  variant?: "compact" | "panel" | "default";
};

export function ClanEditDistanceBar({
  clan,
  avgEditDistance,
  compact = false,
  variant = compact ? "compact" : "default",
}: ClanEditDistanceBarProps) {
  const fill = clan === "red" ? "bg-rose-500" : "bg-blue-500";
  const track = clan === "red" ? "bg-rose-100" : "bg-blue-100";
  const healthPercent = cohesionHealthPercent(avgEditDistance);

  if (variant === "panel") {
    return (
      <div className="mt-3">
        <p className="font-mono text-2xl font-semibold tabular-nums text-zinc-900">
          {formatAvgEditDistance(avgEditDistance)}
          <span className="ml-1 text-sm font-normal text-zinc-400">px</span>
        </p>
        <div
          className={`mt-2 h-2 w-full overflow-hidden rounded-full ${track}`}
          role="meter"
          aria-valuenow={healthPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${avgEditDistance} px average distance`}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${fill}`}
            style={{ width: `${healthPercent}%` }}
          />
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-400">
          Lower is better · px avg
        </p>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="mt-2">
        <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-400">
          <span>Cohesion</span>
          <span className="font-mono tabular-nums text-zinc-600">
            {formatAvgEditDistance(avgEditDistance)} px avg
          </span>
        </div>
        <div
          className={`mt-1 h-1.5 w-full overflow-hidden rounded-full ${track}`}
          role="meter"
          aria-valuenow={healthPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Cohesion ${healthPercent}% — ${avgEditDistance} px average distance`}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${fill}`}
            style={{ width: `${healthPercent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 border-t border-zinc-100 pt-5">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-xs text-zinc-400">Avg edit distance</p>
          <p className="mt-0.5 font-mono text-lg tabular-nums text-zinc-900">
            {formatAvgEditDistance(avgEditDistance)}
            <span className="ml-1 text-sm font-normal text-zinc-400">px</span>
          </p>
        </div>
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className={`h-full rounded-full ${fill}`}
          style={{ width: `${healthPercent}%` }}
        />
      </div>
    </div>
  );
}
