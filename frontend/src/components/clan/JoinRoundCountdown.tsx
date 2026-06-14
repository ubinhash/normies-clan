"use client";

import { useEffect, useState } from "react";
import type { JoinStatus } from "@/hooks/useClanWar";

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0m 0s";

  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

type JoinRoundCountdownProps = {
  round: bigint | undefined;
  joinDeadline: bigint | undefined;
  joinStatus: JoinStatus;
  loading?: boolean;
  canResolveRound?: boolean;
  onResolve?: () => void;
  resolvePending?: boolean;
  resolveError?: string | null;
};

export function JoinRoundCountdown({
  round,
  joinDeadline,
  joinStatus,
  loading = false,
  canResolveRound = false,
  onResolve,
  resolvePending = false,
  resolveError = null,
}: JoinRoundCountdownProps) {
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  if (loading || joinDeadline == null) {
    return (
      <p className="shrink-0 text-center text-xs text-zinc-400">Loading round…</p>
    );
  }

  const deadlineSec = Number(joinDeadline);
  const remaining = Math.max(0, deadlineSec - nowSec);
  const urgent = joinStatus === "open" && remaining < 86_400;

  return (
    <div className="shrink-0 text-right">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">
        {round != null ? `Round ${round.toString()}` : "Round"} · enlistment
      </p>
      <p
        className={`mt-0.5 font-mono text-sm tabular-nums ${
          canResolveRound
            ? "text-amber-700"
            : joinStatus === "closed"
              ? "text-zinc-400"
              : urgent
                ? "text-amber-700"
                : "text-zinc-800"
        }`}
      >
        {canResolveRound
          ? "Enlistment ended"
          : joinStatus === "closed"
            ? "Join closed"
            : remaining === 0
              ? "Ending now"
              : formatCountdown(remaining)}
      </p>
      {canResolveRound && onResolve && (
        <div className="mt-2">
          <button
            type="button"
            onClick={onResolve}
            disabled={resolvePending}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resolvePending ? "Confirm in wallet…" : "Resolve round"}
          </button>
          {resolveError && (
            <p className="mt-1 max-w-[200px] text-right text-[10px] text-red-600">
              {resolveError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
