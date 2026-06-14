#!/usr/bin/env python3
"""
Build a minimum spanning tree over Normie pixels (Hamming distance) and pick the medoid.

Reads pixels.json (id -> 1600-char string), runs Prim's MST in O(n²), finds the medoid
(token with minimum total distance to all others), re-roots the MST at the medoid, and
writes tree.json for the frontend.

Example:
  python scripts/build_tree.py
  python scripts/build_tree.py --input frontend/public/normies/pixels.json
  python scripts/build_tree.py --limit 500   # quick test on first 500 ids
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np

PIXEL_LEN = 1600
BYTES_PER = 200
INF = np.iinfo(np.int32).max


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def pack_string(bits: str) -> np.ndarray:
    if len(bits) != PIXEL_LEN:
        raise ValueError(f"expected {PIXEL_LEN} bits, got {len(bits)}")
    out = np.zeros(BYTES_PER, dtype=np.uint8)
    for i, ch in enumerate(bits):
        if ch not in "01":
            raise ValueError(f"invalid char {ch!r} at position {i}")
        if ch == "1":
            out[i // 8] |= 1 << (7 - (i % 8))
    return out


def load_pixels(path: Path, limit: int | None) -> tuple[list[int], np.ndarray]:
    with path.open(encoding="utf-8") as f:
        raw: dict[str, str] = json.load(f)

    ids = sorted(int(k) for k in raw)
    if limit is not None:
        ids = ids[:limit]

    packed = np.zeros((len(ids), BYTES_PER), dtype=np.uint8)
    for i, token_id in enumerate(ids):
        packed[i] = pack_string(raw[str(token_id)].strip())

    return ids, packed


def hamming_row(i: int, packed: np.ndarray) -> np.ndarray:
    """Hamming distance from packed[i] to every row in packed."""
    x = np.bitwise_xor(packed[i], packed)
    return np.unpackbits(x, axis=1).sum(axis=1, dtype=np.int32)


def prim_mst(packed: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Prim's algorithm; returns parent index (-1 for root) and edge weight to parent."""
    n = len(packed)
    in_tree = np.zeros(n, dtype=bool)
    parent = np.full(n, -1, dtype=np.int32)
    edge_weight = np.zeros(n, dtype=np.int32)
    dist_to_tree = np.full(n, INF, dtype=np.int32)
    dist_to_tree[0] = 0

    for step in range(n):
        dist_to_tree[in_tree] = INF
        u = int(np.argmin(dist_to_tree))
        in_tree[u] = True

        if step > 0 and step % max(1, n // 20) == 0:
            print(f"  MST Prim: {step}/{n} nodes in tree", flush=True)

        d = hamming_row(u, packed)
        mask = ~in_tree
        better = mask & (d < dist_to_tree)
        dist_to_tree[better] = d[better]
        parent[better] = u
        edge_weight[better] = d[better]

    return parent, edge_weight


def find_medoid(packed: np.ndarray) -> tuple[int, np.ndarray]:
    """Return (medoid_index, total_distance_per_node)."""
    n = len(packed)
    totals = np.zeros(n, dtype=np.int64)
    for i in range(n):
        totals += hamming_row(i, packed).astype(np.int64)
        if i > 0 and i % max(1, n // 20) == 0:
            print(f"  medoid: {i}/{n} rows summed", flush=True)
    return int(np.argmin(totals)), totals


def reroot_at(
    parent: np.ndarray,
    edge_weight: np.ndarray,
    root: int,
) -> tuple[np.ndarray, np.ndarray]:
    """Re-orient MST parent pointers so `root` is the tree root."""
    n = len(parent)
    adj: list[list[tuple[int, int]]] = [[] for _ in range(n)]
    for i in range(n):
        p = int(parent[i])
        if p >= 0:
            w = int(edge_weight[i])
            adj[p].append((i, w))
            adj[i].append((p, w))

    new_parent = np.full(n, -1, dtype=np.int32)
    new_weight = np.zeros(n, dtype=np.int32)
    stack = [root]
    seen = {root}
    while stack:
        u = stack.pop()
        for v, w in adj[u]:
            if v in seen:
                continue
            seen.add(v)
            new_parent[v] = u
            new_weight[v] = w
            stack.append(v)

    if len(seen) != n:
        raise RuntimeError(f"reroot: tree disconnected ({len(seen)}/{n} nodes reached)")

    return new_parent, new_weight


def build_children(parent: np.ndarray) -> dict[str, list[int]]:
    children: dict[str, list[int]] = {}
    for i, p in enumerate(parent):
        if p < 0:
            continue
        key = str(int(p))
        children.setdefault(key, []).append(i)
    for k in children:
        children[k].sort()
    return children


def main() -> int:
    parser = argparse.ArgumentParser(description="Build MST + medoid from pixels.json")
    parser.add_argument(
        "--input",
        type=Path,
        default=None,
        help="pixels.json path (default: data/pixels.json, else frontend copy)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="tree.json output (default: data/tree.json)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Only use the first N token ids (sorted) — for quick tests",
    )
    args = parser.parse_args()

    root = repo_root()
    in_path = args.input
    if in_path is None:
        for candidate in (
            root / "data" / "pixels.json",
            root / "frontend" / "public" / "normies" / "pixels.json",
        ):
            if candidate.exists():
                in_path = candidate
                break
    if in_path is None or not in_path.exists():
        print("No pixels.json found. Pass --input.", file=sys.stderr)
        return 1

    out_path = args.output or (root / "data" / "tree.json")

    t0 = time.perf_counter()
    print(f"Loading {in_path}...")
    ids, packed = load_pixels(in_path, args.limit)
    n = len(ids)
    print(f"  {n} normies loaded ({time.perf_counter() - t0:.1f}s)")

    print("Computing medoid (min total Hamming distance)...")
    t1 = time.perf_counter()
    medoid_idx, totals = find_medoid(packed)
    medoid_id = ids[medoid_idx]
    print(f"  medoid: token #{medoid_id} (index {medoid_idx}) in {time.perf_counter() - t1:.1f}s")
    print(f"  total distance sum: {int(totals[medoid_idx])}")

    print("Building MST (Prim)...")
    t2 = time.perf_counter()
    parent, edge_weight = prim_mst(packed)
    print(f"  done in {time.perf_counter() - t2:.1f}s")

    print(f"Re-rooting MST at medoid #{medoid_id}...")
    parent, edge_weight = reroot_at(parent, edge_weight, medoid_idx)

    children = build_children(parent)
    max_depth = _max_depth(medoid_idx, children)
    max_degree = max((len(v) for v in children.values()), default=0)

    tree = {
        "version": 1,
        "count": n,
        "ids": ids,
        "medoid": medoid_id,
        "medoidIndex": medoid_idx,
        "parent": parent.tolist(),
        "edgeWeight": edge_weight.tolist(),
        "children": children,
        "stats": {
            "maxDepth": max_depth,
            "maxDegree": max_degree,
            "medoidTotalDistance": int(totals[medoid_idx]),
            "edgeWeightMin": int(edge_weight[edge_weight > 0].min()) if n > 1 else 0,
            "edgeWeightMax": int(edge_weight.max()),
            "edgeWeightMean": float(edge_weight[edge_weight > 0].mean()) if n > 1 else 0.0,
        },
        "source": str(in_path.relative_to(root)) if in_path.is_relative_to(root) else str(in_path),
        "builtAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(tree, f, separators=(",", ":"))
        f.write("\n")

    size_mb = out_path.stat().st_size / (1024 * 1024)
    print(f"Wrote {out_path} ({size_mb:.2f} MB, total {time.perf_counter() - t0:.1f}s)")
    return 0


def _max_depth(root: int, children: dict[str, list[int]]) -> int:
    def depth(u: int) -> int:
        kids = children.get(str(u), [])
        if not kids:
            return 0
        return 1 + max(depth(v) for v in kids)

    return depth(root)


if __name__ == "__main__":
    raise SystemExit(main())
