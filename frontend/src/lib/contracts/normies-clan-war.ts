import type { ClanId } from "@/lib/clan-config";
import { CLAN_WAR_ADDRESS } from "@/lib/clan-config";
import { normiesClanWarAbi } from "./normies-clan-war-abi";

export { normiesClanWarAbi };

/** NormiesClanWar UUPS proxy on Ethereum mainnet. */
export { CLAN_WAR_ADDRESS };

/** Contract enum: None=0, Red=1, Blue=2 */
export type ContractClan = 0 | 1 | 2;

export function clanIdToContract(clan: ClanId): 1 | 2 {
  return clan === "red" ? 1 : 2;
}

export function contractClanToId(clan: number): ClanId | null {
  if (clan === 1) return "red";
  if (clan === 2) return "blue";
  return null;
}

export function formatEthFromWei(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  if (eth === 0) return "0";
  if (eth < 0.0001) return eth.toPrecision(2);
  return eth.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
