"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useBlock,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { mainnet } from "wagmi/chains";
import { formatEther } from "viem";
import type { ClanId } from "@/lib/clan-config";
import {
  CLAN_WAR_ADDRESS,
  clanIdToContract,
  formatEthFromWei,
  normiesClanWarAbi,
} from "@/lib/contracts/normies-clan-war";

export type JoinStatus = "loading" | "open" | "closed";

export type ClanMemberInfo = {
  tokenId: number;
  enlistedBy: string;
};

export type ClanWarState = {
  loading: boolean;
  error: string | null;
  potWei: bigint | undefined;
  potEth: string;
  joinFeeWei: bigint | undefined;
  joinFeeEth: string;
  round: bigint | undefined;
  joinDeadline: bigint | undefined;
  joinStatus: JoinStatus;
  joinOpen: boolean;
  red: {
    fighterIds: number[];
    members: ClanMemberInfo[];
    memberCount: number;
    avgEditDistance: number;
  };
  blue: {
    fighterIds: number[];
    members: ClanMemberInfo[];
    memberCount: number;
    avgEditDistance: number;
  };
  refetch: () => void;
};

type RoundResult = {
  winningClan: number;
  potPaid: bigint;
  winnerCount: bigint;
  resolved: boolean;
};

function parseRevertMessage(err: unknown): string {
  if (err instanceof Error) {
    const match = err.message.match(/reason: ([^"]+)/i);
    if (match?.[1]) return match[1];
    if (err.message.includes("User rejected")) return "Transaction cancelled";
    return err.message;
  }
  return "Transaction failed";
}

function parseRoundResult(value: unknown): RoundResult | undefined {
  if (value == null) return undefined;

  if (Array.isArray(value)) {
    return {
      winningClan: Number(value[0]),
      potPaid: value[1] as bigint,
      winnerCount: value[2] as bigint,
      resolved: Boolean(value[3]),
    };
  }

  if (typeof value === "object" && "resolved" in value) {
    const row = value as RoundResult;
    return {
      winningClan: Number(row.winningClan),
      potPaid: row.potPaid,
      winnerCount: row.winnerCount,
      resolved: Boolean(row.resolved),
    };
  }

  return undefined;
}

function isJoinWindowOpen(
  deadline: bigint | undefined,
  resolved: boolean | undefined,
  chainNow: bigint,
): JoinStatus {
  if (deadline == null) return "loading";
  if (resolved) return "closed";
  return chainNow < deadline ? "open" : "closed";
}

/** Contract requires >3 members before an eviction (4+ enlisted). */
export const MIN_CLAN_SIZE_TO_EVICT = 4;

export function useClanWar() {
  const { address, isConnected } = useAccount();
  const [writeAction, setWriteAction] = useState<"join" | "evict" | "resolve" | null>(
    null,
  );
  const [evictTokenId, setEvictTokenId] = useState<number | null>(null);

  const { data: block } = useBlock({
    chainId: mainnet.id,
    watch: false,
    query: {
      refetchInterval: 30_000,
      staleTime: 15_000,
    },
  });

  // Prefer chain time; fall back to client clock so a stuck block fetch can't block the UI.
  const chainNow =
    block?.timestamp ?? BigInt(Math.floor(Date.now() / 1000));

  const {
    data: reads,
    isLoading,
    isError,
    error: readError,
    refetch,
  } = useReadContracts({
    contracts: [
      {
        address: CLAN_WAR_ADDRESS,
        abi: normiesClanWarAbi,
        functionName: "pot",
        chainId: mainnet.id,
      },
      {
        address: CLAN_WAR_ADDRESS,
        abi: normiesClanWarAbi,
        functionName: "joinFee",
        chainId: mainnet.id,
      },
      {
        address: CLAN_WAR_ADDRESS,
        abi: normiesClanWarAbi,
        functionName: "round",
        chainId: mainnet.id,
      },
    ],
    query: {
      refetchInterval: 15_000,
      staleTime: 10_000,
    },
  });

  const round = reads?.[2]?.result as bigint | undefined;

  const {
    data: roundReads,
    isLoading: roundLoading,
    refetch: refetchRound,
  } = useReadContracts({
    contracts: round
      ? [
          {
            address: CLAN_WAR_ADDRESS,
            abi: normiesClanWarAbi,
            functionName: "roundJoinDeadline",
            args: [round],
            chainId: mainnet.id,
          },
          {
            address: CLAN_WAR_ADDRESS,
            abi: normiesClanWarAbi,
            functionName: "roundResults",
            args: [round],
            chainId: mainnet.id,
          },
          {
            address: CLAN_WAR_ADDRESS,
            abi: normiesClanWarAbi,
            functionName: "avgEditDistance",
            args: [round, 1],
            chainId: mainnet.id,
          },
          {
            address: CLAN_WAR_ADDRESS,
            abi: normiesClanWarAbi,
            functionName: "avgEditDistance",
            args: [round, 2],
            chainId: mainnet.id,
          },
          {
            address: CLAN_WAR_ADDRESS,
            abi: normiesClanWarAbi,
            functionName: "getClanMembers",
            args: [round, 1],
            chainId: mainnet.id,
          },
          {
            address: CLAN_WAR_ADDRESS,
            abi: normiesClanWarAbi,
            functionName: "getClanMembers",
            args: [round, 2],
            chainId: mainnet.id,
          },
        ]
      : [],
    query: {
      enabled: round != null,
      refetchInterval: 15_000,
      staleTime: 10_000,
    },
  });

  const potWei = reads?.[0]?.result as bigint | undefined;
  const joinFeeWei = reads?.[1]?.result as bigint | undefined;

  const joinDeadline = roundReads?.[0]?.result as bigint | undefined;
  const roundResult = parseRoundResult(roundReads?.[1]?.result);
  const redAvg = roundReads?.[2]?.result as bigint | undefined;
  const blueAvg = roundReads?.[3]?.result as bigint | undefined;
  const redMembers = roundReads?.[4]?.result as
    | readonly { tokenId: bigint; enlistedBy: string; fromBurnPool: boolean }[]
    | undefined;
  const blueMembers = roundReads?.[5]?.result as
    | readonly { tokenId: bigint; enlistedBy: string; fromBurnPool: boolean }[]
    | undefined;

  const joinStatus = useMemo(
    () =>
      isJoinWindowOpen(joinDeadline, roundResult?.resolved, chainNow),
    [joinDeadline, roundResult?.resolved, chainNow],
  );

  const joinOpen = joinStatus === "open";

  const canResolveRound = useMemo(() => {
    if (roundResult?.resolved) return false;
    if (joinDeadline == null) return false;
    return chainNow >= joinDeadline;
  }, [roundResult?.resolved, joinDeadline, chainNow]);

  const state: ClanWarState = useMemo(() => {
    const redMemberList: ClanMemberInfo[] = (redMembers ?? []).map((m) => ({
      tokenId: Number(m.tokenId),
      enlistedBy: m.enlistedBy,
    }));
    const blueMemberList: ClanMemberInfo[] = (blueMembers ?? []).map((m) => ({
      tokenId: Number(m.tokenId),
      enlistedBy: m.enlistedBy,
    }));
    const redFighterIds = redMemberList.map((m) => m.tokenId);
    const blueFighterIds = blueMemberList.map((m) => m.tokenId);
    const readsPending =
      (isLoading && reads == null) ||
      (round != null && roundLoading && roundReads == null);

    return {
      loading: readsPending,
      error: isError
        ? readError?.message ?? "Failed to load clan war contract"
        : null,
      potWei,
      potEth: potWei != null ? formatEthFromWei(potWei) : "…",
      joinFeeWei,
      joinFeeEth: joinFeeWei != null ? formatEthFromWei(joinFeeWei) : "…",
      round,
      joinDeadline,
      joinStatus: readsPending ? "loading" : joinStatus,
      joinOpen: readsPending ? false : joinOpen,
      red: {
        fighterIds: redFighterIds,
        members: redMemberList,
        memberCount: redFighterIds.length,
        avgEditDistance: redAvg != null ? Number(redAvg) : 0,
      },
      blue: {
        fighterIds: blueFighterIds,
        members: blueMemberList,
        memberCount: blueFighterIds.length,
        avgEditDistance: blueAvg != null ? Number(blueAvg) : 0,
      },
      refetch: () => {
        void refetch();
        void refetchRound();
      },
    };
  }, [
    isLoading,
    roundLoading,
    isError,
    readError,
    potWei,
    joinFeeWei,
    round,
    joinStatus,
    joinOpen,
    joinDeadline,
    redMembers,
    blueMembers,
    redAvg,
    blueAvg,
    refetch,
    refetchRound,
  ]);

  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  const joinClan = useCallback(
    async (
      tokenId: number,
      clan: ClanId,
      fromBurnPool: boolean,
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!isConnected || !address) {
        return { ok: false, error: "Connect wallet first" };
      }
      if (joinFeeWei == null) {
        return { ok: false, error: "Join fee not loaded" };
      }
      if (state.joinStatus !== "open") {
        return { ok: false, error: "Join window closed for this round" };
      }

      setWriteAction("join");
      setEvictTokenId(null);
      resetWrite();

      try {
        await writeContract({
          address: CLAN_WAR_ADDRESS,
          abi: normiesClanWarAbi,
          functionName: "joinClan",
          chainId: mainnet.id,
          args: [BigInt(tokenId), clanIdToContract(clan), fromBurnPool],
          value: joinFeeWei,
        });
        return { ok: true };
      } catch (err) {
        setWriteAction(null);
        return { ok: false, error: parseRevertMessage(err) };
      }
    },
    [isConnected, address, joinFeeWei, state.joinStatus, resetWrite, writeContract],
  );

  const evictFeeWei = useMemo(
    () => (joinFeeWei != null ? joinFeeWei * BigInt(2) : undefined),
    [joinFeeWei],
  );

  const evictFromClan = useCallback(
    async (
      tokenId: number,
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!isConnected || !address) {
        return { ok: false, error: "Connect wallet first" };
      }
      if (evictFeeWei == null) {
        return { ok: false, error: "Evict fee not loaded" };
      }
      if (state.joinStatus !== "open") {
        return { ok: false, error: "Join window closed for this round" };
      }

      setWriteAction("evict");
      setEvictTokenId(tokenId);
      resetWrite();

      try {
        await writeContract({
          address: CLAN_WAR_ADDRESS,
          abi: normiesClanWarAbi,
          functionName: "evictFromClan",
          chainId: mainnet.id,
          args: [BigInt(tokenId)],
          value: evictFeeWei,
        });
        return { ok: true };
      } catch (err) {
        setWriteAction(null);
        setEvictTokenId(null);
        return { ok: false, error: parseRevertMessage(err) };
      }
    },
    [
      isConnected,
      address,
      evictFeeWei,
      state.joinStatus,
      resetWrite,
      writeContract,
    ],
  );

  const resolveWar = useCallback(async (): Promise<
    { ok: true } | { ok: false; error: string }
  > => {
    if (!isConnected || !address) {
      return { ok: false, error: "Connect wallet first" };
    }
    if (!canResolveRound) {
      return { ok: false, error: "Round is not ready to resolve" };
    }

    setWriteAction("resolve");
    resetWrite();

    try {
      await writeContract({
        address: CLAN_WAR_ADDRESS,
        abi: normiesClanWarAbi,
        functionName: "resolveWar",
        chainId: mainnet.id,
        args: [false],
      });
      return { ok: true };
    } catch (err) {
      setWriteAction(null);
      return { ok: false, error: parseRevertMessage(err) };
    }
  }, [isConnected, address, canResolveRound, resetWrite, writeContract]);

  const contractPending = isWritePending || isConfirming;
  const joinPending = contractPending && writeAction === "join";
  const evictPending = contractPending && writeAction === "evict";
  const resolvePending = contractPending && writeAction === "resolve";

  const joinError =
    writeAction === "join" && writeError
      ? parseRevertMessage(writeError)
      : null;
  const evictError =
    writeAction === "evict" && writeError
      ? parseRevertMessage(writeError)
      : null;
  const resolveError =
    writeAction === "resolve" && writeError
      ? parseRevertMessage(writeError)
      : null;

  useEffect(() => {
    if (isConfirmed) {
      void refetch();
      void refetchRound();
      resetWrite();
      setWriteAction(null);
      setEvictTokenId(null);
    }
  }, [isConfirmed, refetch, refetchRound, resetWrite]);

  return {
    ...state,
    joinClan,
    evictFromClan,
    resolveWar,
    canResolveRound,
    joinPending,
    evictPending,
    resolvePending,
    evictTokenId,
    joinError,
    evictError,
    resolveError,
    isJoinConfirmed: isConfirmed && writeAction === "join",
    isEvictConfirmed: isConfirmed && writeAction === "evict",
    isResolveConfirmed: isConfirmed && writeAction === "resolve",
    txHash,
    evictFeeWei,
    evictFeeEth:
      evictFeeWei != null ? formatEthFromWei(evictFeeWei) : "…",
    joinFeeFormatted: joinFeeWei != null ? formatEther(joinFeeWei) : null,
  };
}
