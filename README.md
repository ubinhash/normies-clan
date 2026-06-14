# The Norm of Normies

I've built 1)a game and a 2) a tool for normies that plays with the normies **pixel Hamming distance** (count of differing pixels):

1. **Clan War (Game)** — a fully on-chain red vs blue game where the goal is to minimize pixel distance between members within the clans.
2. **Similar Normies Search (Tool)** — find similar normies by pixel similarity, with a draw-your-own normie query mode

** 🔗Live app:** [normies-clan.vercel.app](https://normies-clan.vercel.app/) 

---

## 1. Clan War

**Clan War: The Norm of Normies** — pick Red or Blue, enlist a Normie, and fight for the war chest. The clan with the **most similar set of normies** (lowest average pairwise pixel distance) wins.

### Rules

**Rounds**
- Each round has a **15-day enlistment window**.
- After the window closes, anyone can call `resolveWar` to pick a winner, pay out the pot, and start the next round.

**Join**
- Pay the **join fee** (default 0.0001 ETH) to enlist a Normie in Red or Blue.
- Enlist from **your wallet** (must own or be approved on the Normie) or from the **burn pool** (sacrificed Normies with no owner).
- Each Normie can only be in one clan per round. Max **25 normies per clan**.
- Join fees accumulate in the **war chest**.

**Evict**
- Anyone can evict an enlisted Normie during the enlistment window for **2× the join fee**.
- Half goes to the war chest, half to whoever originally enlisted that Normie.
- A clan must have **more than 3 normies (4+ enlisted)** before evictions are allowed.
- Evicted normies **cannot rejoin the same clan** that round.
- Evicting does **not** qualify you for a war chest share — only normies still enlisted in the **winning clan** when the round resolves get paid.

**Winning**
- Lower **average pairwise Hamming distance** wins (tighter pixel similarity).
- Ties break on clan size, then pot split rules in the contract.
- The war chest is split evenly among all normies enlisted in the winning clan at resolution time.

**Customize & rejoin**
- Clan scores use each Normie’s **current on-chain pixels** (original + canvas XOR layer when customized).
- If you edit your Normie on-chain, **evict yourself and rejoin** for the new pixels to affect your clan’s score.

### Fully on-chain scoring

This is the core hackathon novelty: **pairwise pixel distances are computed entirely on-chain** on every join and eviction.

On each join, the contract:
1. Reads the Normie’s **200-byte bitmap** from **NormiesStorage** (and **NormiesCanvas** when customized)
2. Computes Hamming distance against every existing clan member
3. Incrementally updates the clan’s mean pairwise distance — **O(n) per join**, not O(n²) over the full roster

Only distances between the **newly affected normie and existing clan members** are recomputed; the running sum stays consistent.

### Our contract

**NormiesClanWar** (UUPS proxy) on Ethereum mainnet — [view on Etherscan](https://etherscan.io/address/0x50c03f8e22375cdfe61776cd259c2d6affd82f77)

On each join and eviction, the contract reads pixel data from Normies’ on-chain **NormiesStorage** (raw 40×40 bitmap) and **transformed Normies canvas storage** (XOR layer when a Normie has been customized). It also checks Normies ERC721 ownership for wallet enlistments and burn-pool eligibility.

Contract source: [`contracts/contracts/NormiesClanWar.sol`](contracts/contracts/NormiesClanWar.sol)

---

## 2. Similar Normies Search

Search the collection by **pixel similarity** using precomputed Hamming distance over all 10,000 Normies.

As a side quest, we computed the collection **medoid** — the single Normie with the smallest total pixel distance to every other Normie (the most “average” face in the set). The search UI opens on that token by default, and we also computed per-gender medoids for fun.

**Search by token ID** — enter a Normie # and see the closest matches in the full collection.

**Draw your own** — use the 40×40 pixel grid editor (pen / eraser) to sketch a face, then search for normies with the smallest Hamming distance to your drawing.

**Filters** — narrow results by trait (type, gender) when trait metadata is loaded.

**Pixel diff view** — toggle per-pixel diff charts between your query and each result.

**Pixel source toggle** — compare against **original** on-chain pixels or **customized** (composited) pixels.

Search runs client-side against bundled pixel maps in `frontend/public/normies/` (`pixels.json`, optional `pixels-diff.json`, `traits.json`).

---

## Normies API usage

Base URL: **`https://api.normies.art`**

### Clan War (live)

| Endpoint | Used for |
|----------|----------|
| `GET /normie/{id}/pixels` | Composited pixel strings (clan average face, live drawer preload) |
| `GET /normie/{id}/image.svg` | Composited Normie images in the UI |
| `GET /history/burned/{id}/image.svg` | Burn-pool Normie images |
| `GET /holders/{address}` | Load Normies owned by connected wallet |
| `GET /history/burned-tokens` | Paginated list of burn-pool token IDs |
| `GET /history/burns` | Burn commit metadata (burn pool loader) |

### Similar Normies Search

| Endpoint / data | Used for |
|-----------------|----------|
| `GET /normie/{id}/original/image.svg` | Thumbnails in search results |
| Bundled `pixels.json` | Offline Hamming search over all 10k original pixels |
| Bundled `pixels-diff.json` | Optional customized-pixel search mode |
| Bundled `traits.json` | Type / gender filters and trait panels |



---

## Repo layout

```
frontend/          Next.js app (Clan War + Similar Normies Search)
contracts/         NormiesClanWar UUPS proxy + tests
scripts/           Offline data prep (not required to run the app)
```
