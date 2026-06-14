import { API_BASE } from "./clan-config";

const PAGE_SIZE = 100;
const PIXEL_LEN = 1600;

export type HoldersResponse = {
  address: string;
  tokenIds: string[];
};

export type BurnCommitment = {
  commitId: string;
  owner: string;
  receiverTokenId: string;
  tokenCount: number;
  transferredActionPoints: string;
  blockNumber: string;
  timestamp: string;
  txHash: string;
  revealed: boolean;
  totalActions: string;
  expired: boolean;
};

export type BurnedTokenRecord = {
  tokenId: string;
  txHash: string;
  blockNumber: string;
  timestamp: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

/** Paginate GET /history/burns (max 100 per page). */
export async function fetchAllBurnCommits(
  onProgress?: (loaded: number) => void,
): Promise<BurnCommitment[]> {
  const all: BurnCommitment[] = [];
  let offset = 0;

  while (true) {
    const page = await fetchJson<BurnCommitment[]>(
      `${API_BASE}/history/burns?limit=${PAGE_SIZE}&offset=${offset}`,
    );
    all.push(...page);
    onProgress?.(all.length);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}

/**
 * Burn pool fighters: paginate GET /history/burned-tokens.
 * (Individual sacrificed IDs live here; /history/burns is per-commit metadata.)
 */
export async function fetchAllBurnedTokenIds(
  onProgress?: (loaded: number) => void,
): Promise<number[]> {
  const ids: number[] = [];
  let offset = 0;

  while (true) {
    const page = await fetchJson<BurnedTokenRecord[]>(
      `${API_BASE}/history/burned-tokens?limit=${PAGE_SIZE}&offset=${offset}`,
    );
    for (const row of page) {
      const id = parseInt(row.tokenId, 10);
      if (!Number.isNaN(id)) ids.push(id);
    }
    onProgress?.(ids.length);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return [...new Set(ids)].sort((a, b) => a - b);
}

/** Load burn commits + burned token IDs for the public pool. */
export async function fetchBurnPoolData(
  onProgress?: (phase: string, count: number) => void,
): Promise<{ commits: BurnCommitment[]; poolIds: number[] }> {
  const commits = await fetchAllBurnCommits((n) =>
    onProgress?.("commits", n),
  );
  const poolIds = await fetchAllBurnedTokenIds((n) =>
    onProgress?.("tokens", n),
  );
  return { commits, poolIds };
}

export async function fetchHolderNormies(address: string): Promise<number[]> {
  const normalized = address.trim();
  const res = await fetch(
    `${API_BASE}/holders/${encodeURIComponent(normalized)}`,
  );
  if (!res.ok) {
    throw new Error(`Holders API error (${res.status})`);
  }
  const data = (await res.json()) as HoldersResponse;
  return data.tokenIds
    .map((id) => parseInt(id, 10))
    .filter((id) => !Number.isNaN(id))
    .sort((a, b) => a - b);
}

export function shortenAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Composited 40×40 pixels (canvas edits applied when customized). */
export async function fetchNormiePixels(tokenId: number): Promise<string> {
  const res = await fetch(`${API_BASE}/normie/${tokenId}/pixels`);
  if (!res.ok) {
    throw new Error(`Pixels API error (${res.status})`);
  }
  const text = (await res.text()).trim();
  if (text.length !== PIXEL_LEN || /[^01]/.test(text)) {
    throw new Error(`Invalid pixel data for #${tokenId}`);
  }
  return text;
}
