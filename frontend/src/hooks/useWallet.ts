"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { fetchHolderNormies } from "@/lib/normies-api";

export function useWallet() {
  const { address, isConnected } = useAccount();
  const [ownedIds, setOwnedIds] = useState<number[]>([]);
  const [loadingOwned, setLoadingOwned] = useState(false);
  const [ownedError, setOwnedError] = useState<string | null>(null);

  const loadOwned = useCallback(async (addr: string) => {
    setLoadingOwned(true);
    setOwnedError(null);
    try {
      const ids = await fetchHolderNormies(addr);
      setOwnedIds(ids);
    } catch (e) {
      setOwnedIds([]);
      setOwnedError(
        e instanceof Error ? e.message : "Failed to load your Normies",
      );
    } finally {
      setLoadingOwned(false);
    }
  }, []);

  useEffect(() => {
    if (address) {
      void loadOwned(address);
    } else {
      setOwnedIds([]);
      setOwnedError(null);
      setLoadingOwned(false);
    }
  }, [address, loadOwned]);

  return {
    address: address ?? null,
    connected: isConnected,
    ownedIds,
    loadingOwned,
    ownedError,
    refreshOwned: address ? () => loadOwned(address) : undefined,
  };
}
