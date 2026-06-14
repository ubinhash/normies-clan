"use client";

import { useEffect, useState } from "react";
import { computeHardConsensus, computeSoftAverage } from "@/lib/average-face";
import { getPixelsForIds, loadCustomizedPixelsMap } from "@/lib/pixels-cache";

export function useClanSoftAverage(fighterIds: number[]) {
  const [means, setMeans] = useState<number[] | null>(null);
  const [hardBits, setHardBits] = useState<string | null>(null);
  const [found, setFound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const key = fighterIds.join(",");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const map = await loadCustomizedPixelsMap();
        if (cancelled) return;
        const { bits, found: n } = getPixelsForIds(map, fighterIds);
        setFound(n);
        setMeans(computeSoftAverage(bits));
        setHardBits(computeHardConsensus(bits));
      } catch (e) {
        if (!cancelled) {
          setMeans(null);
          setHardBits(null);
          setFound(0);
          setError(e instanceof Error ? e.message : "Failed to load pixels");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key, fighterIds]);

  return { means, hardBits, found, total: fighterIds.length, loading, error };
}
