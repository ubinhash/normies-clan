import type { ClanId } from "./clan-config";

/** Demo data until wallet + contract hooks exist. */

export const MOCK_POT_ETH = "2.47";

/** Mean pixel edit distance per fighter (0–1600) — lower wins. */
export const MOCK_CLAN_AVG_EDIT_DISTANCE = { red: 291, blue: 268 };

export const MOCK_CLAN_MEMBERS = { red: 64, blue: 59 };

function buildMockFighterIds(clan: ClanId, count: number): number[] {
  const offset = clan === "red" ? 0 : 5000;
  const ids: number[] = [];
  for (let i = 0; i < count; i++) {
    ids.push((offset + i * 137 + (i % 17) * 11) % 10000);
  }
  return ids;
}

/** Enlisted fighters per clan — replace with contract read later. */
export const MOCK_CLAN_FIGHTERS: Record<ClanId, number[]> = {
  red: buildMockFighterIds("red", MOCK_CLAN_MEMBERS.red),
  blue: buildMockFighterIds("blue", MOCK_CLAN_MEMBERS.blue),
};
