"use client";

import { useEffect, useMemo, useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { OpenSeaLink } from "@/components/OpenSeaLink";
import { NormieCard } from "./NormieCard";
import { PotDisplay } from "./PotDisplay";
import { JoinRoundCountdown } from "./JoinRoundCountdown";
import { ClanPanel } from "./ClanPanel";
import { ClanMembersRow } from "./ClanMembersRow";
import { useBurnPool } from "@/hooks/useBurnPool";
import { useClanWar } from "@/hooks/useClanWar";
import { useWallet } from "@/hooks/useWallet";
import { CLANS, CLAN_WAR_ETHERSCAN_URL, type ClanId } from "@/lib/clan-config";
import { getLeadingClan } from "@/lib/clan-stats";

type RosterTab = "owned" | "pool";

function getEnlistedClan(
  tokenId: number | null,
  redIds: number[],
  blueIds: number[],
): ClanId | null {
  if (tokenId == null) return null;
  if (redIds.includes(tokenId)) return "red";
  if (blueIds.includes(tokenId)) return "blue";
  return null;
}

function clanJoinButtonClass(
  clan: ClanId | null,
  ready: boolean,
  enlistedClan: ClanId | null = null,
): string {
  const base =
    "inline-flex min-w-[160px] shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed";

  if (enlistedClan) {
    return enlistedClan === "red"
      ? `${base} border border-rose-200 bg-zinc-100 text-rose-700 disabled:opacity-100`
      : `${base} border border-blue-200 bg-zinc-100 text-blue-700 disabled:opacity-100`;
  }

  if (clan === "red") {
    return ready
      ? `${base} bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40`
      : `${base} border-2 border-rose-500 bg-rose-50 text-rose-800 disabled:opacity-50`;
  }
  if (clan === "blue") {
    return ready
      ? `${base} bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40`
      : `${base} border-2 border-blue-500 bg-blue-50 text-blue-800 disabled:opacity-50`;
  }
  return `${base} bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-40`;
}

function JoinButtonLabel({
  selectedClan,
  joinFeeEth,
  joinPending,
  connected,
  loadingClanWar,
  joinStatus,
  step1Done,
  step2Done,
  ready,
  enlistedClan,
}: {
  selectedClan: ClanId | null;
  joinFeeEth: string;
  joinPending: boolean;
  connected: boolean;
  loadingClanWar: boolean;
  joinStatus: string;
  step1Done: boolean;
  step2Done: boolean;
  ready: boolean;
  enlistedClan: ClanId | null;
}) {
  if (joinPending) return <>Confirm in wallet…</>;
  if (!connected) return <>Connect wallet</>;
  if (loadingClanWar || joinStatus === "loading") return <>Loading…</>;
  if (joinStatus === "closed") return <>Join closed</>;
  if (enlistedClan) {
    const dot =
      enlistedClan === "red" ? "bg-rose-600" : "bg-blue-600";
    return (
      <>
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
        In {CLANS[enlistedClan].label}
      </>
    );
  }
  if (!step1Done) return <>Pick a clan first</>;
  if (selectedClan) {
    const dot = ready
      ? "bg-white"
      : selectedClan === "red"
        ? "bg-rose-600"
        : "bg-blue-600";
    const label = CLANS[selectedClan].label;
    return (
      <>
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
        Join {label} · {joinFeeEth} ETH
      </>
    );
  }
  if (!step2Done) return <>Pick a Normie</>;
  return <>Join · {joinFeeEth} ETH</>;
}

export function ClanGame() {
  const { openConnectModal } = useConnectModal();
  const {
    connected,
    address,
    ownedIds,
    loadingOwned,
    ownedError,
    refreshOwned,
  } = useWallet();
  const {
    poolIds,
    loading: loadingPool,
    error: poolError,
    progress: poolProgress,
    loaded: poolLoaded,
    load: loadPool,
    refresh: refreshPool,
  } = useBurnPool();
  const {
    loading: loadingClanWar,
    error: clanWarError,
    potEth,
    potWei,
    joinFeeEth,
    joinStatus,
    joinOpen,
    round,
    joinDeadline,
    red,
    blue,
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
    evictFeeEth,
    isJoinConfirmed,
    isEvictConfirmed,
    isResolveConfirmed,
    refetch: refetchClanWar,
  } = useClanWar();

  const [rosterTab, setRosterTab] = useState<RosterTab>("owned");
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [selectedClan, setSelectedClan] = useState<ClanId | null>(null);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [joinMessageIsError, setJoinMessageIsError] = useState(false);

  useEffect(() => {
    if (rosterTab === "pool" && !poolLoaded && !loadingPool) {
      void loadPool();
    }
  }, [rosterTab, poolLoaded, loadingPool, loadPool]);

  useEffect(() => {
    if (!connected) {
      setSelectedTokenId(null);
      setRosterTab("owned");
    }
  }, [connected]);

  useEffect(() => {
    if (isJoinConfirmed) {
      setJoinMessage("Enlisted! Your Normie joined the clan.");
      setJoinMessageIsError(false);
      setSelectedTokenId(null);
      void refreshOwned?.();
    }
  }, [isJoinConfirmed, refreshOwned]);

  useEffect(() => {
    if (isEvictConfirmed) {
      setJoinMessage("Normie evicted from the clan.");
      setJoinMessageIsError(false);
      if (
        selectedTokenId != null &&
        !red.fighterIds.includes(selectedTokenId) &&
        !blue.fighterIds.includes(selectedTokenId)
      ) {
        setSelectedTokenId(null);
      }
    }
  }, [isEvictConfirmed, selectedTokenId, red.fighterIds, blue.fighterIds]);

  useEffect(() => {
    if (isResolveConfirmed) {
      setJoinMessage("Round resolved — a new enlistment window has started.");
      setJoinMessageIsError(false);
    }
  }, [isResolveConfirmed]);

  useEffect(() => {
    if (selectedClan == null) {
      setSelectedTokenId(null);
    }
  }, [selectedClan]);

  const handleClanClick = (clan: ClanId) => {
    setSelectedClan(clan);
  };

  const roster = rosterTab === "owned" ? ownedIds : poolIds;

  const selectionSource = useMemo(() => {
    if (selectedTokenId == null) return null;
    if (ownedIds.includes(selectedTokenId)) return "owned" as const;
    if (poolIds.includes(selectedTokenId)) return "pool" as const;
    return null;
  }, [selectedTokenId, ownedIds, poolIds]);

  const avgEditDistance = useMemo(
    () => ({ red: red.avgEditDistance, blue: blue.avgEditDistance }),
    [red.avgEditDistance, blue.avgEditDistance],
  );

  const leadingClan = getLeadingClan(avgEditDistance);

  const step1Done = selectedClan != null;
  const step2Done = selectedTokenId != null;
  const fighterSelectionEnabled = step1Done;

  const enlistedClan = useMemo(
    () =>
      getEnlistedClan(selectedTokenId, red.fighterIds, blue.fighterIds),
    [selectedTokenId, red.fighterIds, blue.fighterIds],
  );

  const alreadyEnlisted = enlistedClan != null;

  const canJoin =
    connected &&
    joinOpen &&
    !loadingClanWar &&
    !alreadyEnlisted &&
    selectedTokenId != null &&
    selectedClan != null &&
    (selectionSource === "pool" || selectionSource === "owned");

  const handleJoin = async () => {
    if (!canJoin || selectedTokenId == null || selectedClan == null) return;
    setJoinMessage(null);

    const fromBurnPool = selectionSource === "pool";
    const result = await joinClan(selectedTokenId, selectedClan, fromBurnPool);
    if (!result.ok) {
      setJoinMessage(result.error);
      setJoinMessageIsError(true);
    }
  };

  const handleEvict = async (tokenId: number) => {
    setJoinMessage(null);
    const result = await evictFromClan(tokenId);
    if (!result.ok) {
      setJoinMessage(result.error);
      setJoinMessageIsError(true);
    }
  };

  const handleResolveRound = () => {
    if (!connected) {
      openConnectModal?.();
      return;
    }
    setJoinMessage(null);
    void resolveWar().then((result) => {
      if (!result.ok) {
        setJoinMessage(result.error);
        setJoinMessageIsError(true);
      }
    });
  };

  const footerHint = (() => {
    if (joinMessage || joinError || evictError) return null;
    if (!step1Done && !step2Done) {
      return "Step 1: pick a clan · Step 2: pick a Normie";
    }
    if (step1Done && !step2Done) {
      return `Step 2: pick a Normie to enlist in ${CLANS[selectedClan!].label}`;
    }
    return null;
  })();

  const handleFooterAction = () => {
    if (!connected) {
      openConnectModal?.();
      return;
    }
    void handleJoin();
  };

  const footerButtonDisabled =
    evictPending ||
    (connected && (!canJoin || joinPending || alreadyEnlisted));

  const footerButtonClass = !connected
    ? "inline-flex min-w-[160px] shrink-0 items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
    : clanJoinButtonClass(selectedClan, canJoin, enlistedClan);

  return (
    <div className="flex min-h-full flex-col bg-zinc-100 text-zinc-950">
      <main className="relative z-0 mx-auto w-full max-w-6xl flex-1 px-6 pb-32 pt-8 sm:px-8">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-4xl tracking-tight text-zinc-950 sm:text-5xl">
              Clan War: The Norm of Normies
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-600">
              Pick a clan, enlist a Normie, win the war chest.
            </p>
            <p className="mt-1 max-w-lg text-xs leading-relaxed text-zinc-500">
              The clan with the{" "}
              <span className="font-medium text-amber-700">
                most similar set of normies
              </span>{" "}
              (lowest average pixel distance) wins the war.
            </p>
          </div>
          <JoinRoundCountdown
            round={round}
            joinDeadline={joinDeadline}
            joinStatus={joinStatus}
            loading={loadingClanWar}
            canResolveRound={canResolveRound}
            onResolve={handleResolveRound}
            resolvePending={resolvePending}
            resolveError={resolveError}
          />
        </header>

        {clanWarError && (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
            {clanWarError}
            <button
              type="button"
              onClick={() => refetchClanWar()}
              className="ml-2 underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loadingClanWar && joinStatus === "closed" && (
          <p className="mt-4 text-sm text-zinc-500">
            Join window closed for this round.
          </p>
        )}

        <div className="mt-8">
          <PotDisplay
            potEth={potEth}
            joinFeeEth={joinFeeEth}
            variant="banner"
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
          {/* Left — clans (60%) */}
          <section
            id="choose-clan"
            className={`rounded-2xl p-4 transition-all ${
              selectedClan == null
                ? "border-2 border-dashed border-emerald-400/80 bg-emerald-50/40 ring-2 ring-emerald-300/30"
                : "border border-transparent"
            }`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2
                className={`text-xs font-semibold uppercase tracking-[0.14em] ${
                  selectedClan == null ? "text-emerald-800" : "text-zinc-500"
                }`}
              >
                Step 1: Select clan
              </h2>
              {selectedClan == null && (
                <p className="text-xs font-medium text-emerald-700">
                  Pick a clan to continue →
                </p>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <ClanPanel
                  clan="red"
                  fighterIds={red.fighterIds}
                  avgEditDistance={red.avgEditDistance}
                  isLeading={leadingClan === "red"}
                  members={red.memberCount}
                  potWei={potWei}
                  selected={selectedClan === "red"}
                  onSelect={() => handleClanClick("red")}
                />
                {selectedClan === "red" && (
                  <ClanMembersRow
                    clan="red"
                    members={red.members}
                    connectedAddress={address}
                    connected={connected}
                    joinOpen={joinOpen}
                    evictFeeEth={evictFeeEth}
                    evictPending={evictPending}
                    evictPendingTokenId={evictTokenId}
                    onEvict={handleEvict}
                  />
                )}
              </div>
              <div className="min-w-0">
                <ClanPanel
                  clan="blue"
                  fighterIds={blue.fighterIds}
                  avgEditDistance={blue.avgEditDistance}
                  isLeading={leadingClan === "blue"}
                  members={blue.memberCount}
                  potWei={potWei}
                  selected={selectedClan === "blue"}
                  onSelect={() => handleClanClick("blue")}
                />
                {selectedClan === "blue" && (
                  <ClanMembersRow
                    clan="blue"
                    members={blue.members}
                    connectedAddress={address}
                    connected={connected}
                    joinOpen={joinOpen}
                    evictFeeEth={evictFeeEth}
                    evictPending={evictPending}
                    evictPendingTokenId={evictTokenId}
                    onEvict={handleEvict}
                  />
                )}
              </div>
            </div>
            <p className="mt-3 text-[10px] italic leading-relaxed text-zinc-400">
              ⛓ Pairwise average distances are {" "}
              <span className="font-medium not-italic text-emerald-700">
              computed fully on-chain</span> upon join and eviction for fair resolution
              
              . Only distances between the affected member and the existing clan
              are recomputed. So if you{" "}
              <span className="font-medium not-italic text-emerald-700">
                customized
              </span>{" "}
              your Normie, <span className="font-medium not-italic text-emerald-700">evict</span> yourself at a cost and{" "}
              <span className="font-medium not-italic text-emerald-700">
                rejoin
              </span>{" "}
              for it to take effect.{" "}
              <a
                href={CLAN_WAR_ETHERSCAN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium not-italic text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
              >
                View contract on Etherscan
              </a>
            </p>
          </section>

          {/* Right — fighter selection (40%) */}
          <aside
            className={`rounded-2xl p-4 transition-all lg:sticky lg:top-6 ${
              step1Done && !step2Done
                ? "border-2 border-dashed border-emerald-400/80 bg-emerald-50/40 ring-2 ring-emerald-300/30"
                : "border border-transparent"
            }`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2
                className={`text-xs font-semibold uppercase tracking-[0.14em] ${
                  step1Done && !step2Done ? "text-emerald-800" : "text-zinc-500"
                }`}
              >
                Step 2: Pick a normie
              </h2>
              {step1Done && !step2Done && (
                <p className="text-xs font-medium text-emerald-700">
                  Pick a Normie to enlist →
                </p>
              )}
            </div>

            <section
              id="choose-fighter"
              className={`mt-3 rounded-2xl border p-5 shadow-sm ${
                fighterSelectionEnabled
                  ? "border-zinc-200 bg-white"
                  : "border-zinc-200 bg-zinc-50"
              }`}
            >
              <p className="text-sm text-zinc-600">
                {selectedClan
                  ? `Enlist a Normie into ${CLANS[selectedClan].label}.`
                  : "Select a clan first, then pick a Normie."}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {step1Done
                  ? "Choose from your wallet or the burn pool."
                  : "Complete step 1 on the left."}
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={!connected}
                  onClick={() => setRosterTab("owned")}
                  className={
                    rosterTab === "owned" ? "btn-primary" : "btn-secondary"
                  }
                >
                  Yours
                  {connected ? ` (${ownedIds.length})` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => setRosterTab("pool")}
                  className={
                    rosterTab === "pool" ? "btn-primary" : "btn-secondary"
                  }
                >
                  Burn pool ({poolLoaded ? poolIds.length : "…"})
                </button>
              </div>

              {!fighterSelectionEnabled && (
                <div className="mt-4 rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-4 text-center text-xs text-zinc-500">
                  Select <strong>Clan Red</strong> or <strong>Clan Blue</strong>{" "}
                  to unlock normie selection
                </div>
              )}

              <div className="mt-4">
                {!connected && rosterTab === "owned" && (
                  <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
                    Connect your wallet to load Normies you hold.
                  </div>
                )}

                {connected && rosterTab === "owned" && ownedError && (
                  <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                    {ownedError}
                    {refreshOwned && (
                      <button
                        type="button"
                        onClick={() => void refreshOwned()}
                        className="ml-2 underline"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}

                {connected && rosterTab === "owned" && loadingOwned && (
                  <p className="text-xs text-zinc-400">Loading your Normies…</p>
                )}

                {(connected && rosterTab === "owned" && !loadingOwned) ||
                rosterTab === "pool" ? (
                  <>
                    {rosterTab === "pool" && poolError && (
                      <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                        {poolError}
                        <button
                          type="button"
                          onClick={() => void refreshPool()}
                          className="ml-2 underline"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                    {rosterTab === "pool" && loadingPool && poolIds.length === 0 && (
                      <p className="mb-3 text-xs text-zinc-400">
                        {poolProgress ?? "Loading burn pool…"}
                      </p>
                    )}
                    {rosterTab === "pool" &&
                      !poolError &&
                      (poolIds.length > 0 || poolLoaded) && (
                        <p className="mb-3 text-xs text-zinc-500">
                          {poolIds.length} burned Normie
                          {poolIds.length === 1 ? "" : "s"}
                          {loadingPool ? " — loading more…" : ""}
                          {!loadingPool && " — anyone can enlist."}
                        </p>
                      )}
                    {connected &&
                      rosterTab === "owned" &&
                      !loadingOwned &&
                      ownedIds.length === 0 && (
                        <div className="mb-3 text-xs text-zinc-400">
                          <p>No Normies found in your wallet.</p>
                          <p className="mt-1 text-zinc-500">
                            Not a holder? Enlist any burned Normie from the{" "}
                            <button
                              type="button"
                              onClick={() => setRosterTab("pool")}
                              className="font-medium text-zinc-700 underline underline-offset-2"
                            >
                              Burn pool
                            </button>
                            .
                          </p>
                        </div>
                      )}
                    <div
                      className={`max-h-[480px] overflow-y-auto pr-1 ${
                        !fighterSelectionEnabled
                          ? "pointer-events-none opacity-40"
                          : ""
                      }`}
                    >
                      <div className="flex flex-wrap gap-2">
                        {rosterTab === "pool" && poolLoaded && roster.length === 0 ? (
                          <p className="text-xs text-zinc-400">
                            No burned Normies in pool.
                          </p>
                        ) : roster.length === 0 && rosterTab === "owned" ? null : (
                          roster.map((id) => (
                            <NormieCard
                              key={id}
                              tokenId={id}
                              selected={selectedTokenId === id}
                              selectedClan={selectedClan}
                              enlistedClan={getEnlistedClan(
                                id,
                                red.fighterIds,
                                blue.fighterIds,
                              )}
                              disabled={!fighterSelectionEnabled}
                              onSelect={() => {
                                if (fighterSelectionEnabled) {
                                  setSelectedTokenId(id);
                                }
                              }}
                              badge={rosterTab === "pool" ? "burn" : "yours"}
                              size="sm"
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </main>

      {/* Join bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-3">
          <div className="min-w-0 flex-1 text-sm text-zinc-500">
            {joinMessage ? (
              <span
                className={
                  joinMessageIsError ? "text-rose-600" : "text-emerald-700"
                }
              >
                {joinMessage}
              </span>
            ) : joinError || evictError ? (
              <span className="text-rose-600">{joinError ?? evictError}</span>
            ) : alreadyEnlisted && selectedTokenId != null ? (
              <span className="text-zinc-700">
                Normie{" "}
                <span className="font-mono font-medium">#{selectedTokenId}</span>{" "}
                is already in{" "}
                <span
                  className={`font-medium ${
                    enlistedClan === "red" ? "text-rose-600" : "text-blue-600"
                  }`}
                >
                  {CLANS[enlistedClan!].label}
                </span>
                . Pick another Normie.
              </span>
            ) : canJoin && selectedClan ? (
              <span className="text-zinc-800">
                Enlist{" "}
                <span className="font-mono font-medium">#{selectedTokenId}</span>
                {" → "}
                <span
                  className={`font-medium ${
                    selectedClan === "red" ? "text-rose-600" : "text-blue-600"
                  }`}
                >
                  {CLANS[selectedClan].label}
                </span>{" "}
                · {joinFeeEth} ETH
              </span>
            ) : selectedClan != null && selectedTokenId == null ? (
              <span className="text-zinc-700">
                Step 2: pick a Normie for {CLANS[selectedClan].label}
              </span>
            ) : footerHint ? (
              <span>{footerHint}</span>
            ) : (
              "Select a clan, then a Normie"
            )}
          </div>
          <button
            type="button"
            disabled={footerButtonDisabled}
            onClick={handleFooterAction}
            className={footerButtonClass}
          >
            <JoinButtonLabel
              selectedClan={selectedClan}
              joinFeeEth={joinFeeEth}
              joinPending={joinPending}
              connected={connected}
              loadingClanWar={loadingClanWar}
              joinStatus={joinStatus}
              step1Done={step1Done}
              step2Done={step2Done}
              ready={canJoin}
              enlistedClan={enlistedClan}
            />
          </button>
        </div>
      </footer>
    </div>
  );
}
