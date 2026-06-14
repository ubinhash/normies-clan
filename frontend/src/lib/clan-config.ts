export const API_BASE = "https://api.normies.art";
/** Composited image (canvas edits applied when customized). */
export const NORMIE_IMG = (id: number) =>
  `${API_BASE}/normie/${id}/image.svg`;

export const BURNED_NORMIE_IMG = (id: number) =>
  `${API_BASE}/history/burned/${id}/image.svg`;

export const NORMIES_CONTRACT =
  "0x9eb6e2025b64f340691e424b7fe7022ffde12438";

/** NormiesClanWar proxy — override via NEXT_PUBLIC_CLAN_WAR_ADDRESS */
const clanWarFromEnv = process.env.NEXT_PUBLIC_CLAN_WAR_ADDRESS?.trim();
export const CLAN_WAR_ADDRESS = (
  clanWarFromEnv && clanWarFromEnv.length > 0
    ? clanWarFromEnv
    : "0x50c03f8e22375cdfe61776cd259c2d6affd82f77"
) as `0x${string}`;

export const CLAN_WAR_ETHERSCAN_URL = `https://etherscan.io/address/${CLAN_WAR_ADDRESS}`;

export const OPENSEA_NORMIE_URL = (id: number) =>
  `https://opensea.io/item/ethereum/${NORMIES_CONTRACT}/${id}`;

export type ClanId = "red" | "blue";

export const CLANS: Record<
  ClanId,
  { name: string; label: string; accent: string; accentMuted: string; glow: string }
> = {
  red: {
    name: "Crimson",
    label: "Clan Red",
    accent: "#e11d48",
    accentMuted: "#9f1239",
    glow: "rgba(225, 29, 72, 0.35)",
  },
  blue: {
    name: "Azure",
    label: "Clan Blue",
    accent: "#2563eb",
    accentMuted: "#1e40af",
    glow: "rgba(37, 99, 235, 0.35)",
  },
};
