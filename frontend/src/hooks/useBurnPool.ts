"use client";

import { useCallback, useState } from "react";
import { fetchBurnPoolData } from "@/lib/normies-api";

export function useBurnPool() {
  const [poolIds, setPoolIds] = useState<number[]>([]);
  const [burnCommitCount, setBurnCommitCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (loaded && poolIds.length > 0) return;
    setLoading(true);
    setError(null);
    setProgress("Loading burn history…");
    try {
      const { commits, poolIds: ids } = await fetchBurnPoolData((phase, count) => {
        setProgress(
          phase === "commits"
            ? `Burn commits… ${count}`
            : `Burned tokens… ${count}`,
        );
      });
      setPoolIds(ids);
      setBurnCommitCount(commits.length);
      setLoaded(true);
    } catch (e) {
      setPoolIds([]);
      setBurnCommitCount(0);
      setError(
        e instanceof Error ? e.message : "Failed to load burn pool",
      );
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [loaded, poolIds.length]);

  return {
    poolIds,
    burnCommitCount,
    loading,
    error,
    progress,
    loaded,
    load,
    refresh: async () => {
      setLoaded(false);
      await load();
    },
  };
}
