#!/usr/bin/env python3
"""
Precompute per-gender medoids (most average Normie within Male / Female / Non-Binary).

Writes a small JSON file for the frontend — avoids O(n²) Hamming in the browser.

Example:
  python scripts/gender_medoids.py
  python scripts/gender_medoids.py --output frontend/public/normies/gender_medoids.json
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np

from build_tree import load_pixels, repo_root

GENDERS = ("Male", "Female", "Non-Binary")


def find_medoid_subset(
    packed: np.ndarray,
    indices: list[int],
) -> tuple[int, int, int]:
    """Return (global_index, count, rounded mean distance to others)."""
    m = len(indices)
    if m == 0:
        raise ValueError("empty subset")
    if m == 1:
        return indices[0], 1, 0

    sub = packed[indices]
    totals = np.zeros(m, dtype=np.int64)
    for i in range(m):
        x = np.bitwise_xor(sub[i], sub)
        totals[i] = np.unpackbits(x, axis=1).sum(axis=1, dtype=np.int64).sum()

    best = int(np.argmin(totals))
    best_total = int(totals[best])
    return indices[best], m, round(best_total / (m - 1))


def main() -> int:
    parser = argparse.ArgumentParser(description="Precompute gender medoids")
    parser.add_argument("--pixels", type=Path, default=None)
    parser.add_argument("--traits", type=Path, default=None)
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args()

    root = repo_root()
    pixels_path = args.pixels or root / "frontend" / "public" / "normies" / "pixels.json"
    traits_path = args.traits or root / "data" / "traits.json"
    out_path = args.output or root / "frontend" / "public" / "normies" / "gender_medoids.json"

    if not pixels_path.exists():
        print(f"Missing {pixels_path}", file=sys.stderr)
        return 1
    if not traits_path.exists():
        print(f"Missing {traits_path}", file=sys.stderr)
        return 1

    t0 = time.perf_counter()
    ids, packed = load_pixels(pixels_path, None)
    id_to_idx = {tid: i for i, tid in enumerate(ids)}

    with traits_path.open(encoding="utf-8") as f:
        traits: dict[str, dict] = json.load(f)

    by_gender: dict[str, list[int]] = {g: [] for g in GENDERS}
    for key, entry in traits.items():
        gender = entry.get("Gender")
        if gender not in by_gender:
            continue
        tid = int(key)
        if tid in id_to_idx:
            by_gender[gender].append(id_to_idx[tid])

    out: dict[str, dict] = {}
    for gender in GENDERS:
        indices = by_gender[gender]
        if not indices:
            continue
        t1 = time.perf_counter()
        gidx, count, avg = find_medoid_subset(packed, indices)
        token_id = ids[gidx]
        out[gender] = {
            "tokenId": token_id,
            "count": count,
            "avgDistance": avg,
        }
        print(f"  {gender}: #{token_id} (n={count}, avg Δ {avg}px) in {time.perf_counter() - t1:.1f}s")

    payload = {
        "version": 1,
        "builtAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "medoids": out,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, separators=(",", ":"))
        f.write("\n")

    print(f"Wrote {out_path} ({time.perf_counter() - t0:.1f}s total)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
