#!/usr/bin/env python3
"""
Cluster Normies by pixel Hamming distance (no MST).

Loads pixels.json, builds a pairwise distance matrix, runs agglomerative
clustering for each k in a range (or a fixed k), picks k by silhouette score,
and writes clusters.json with per-cluster medoids.

Example:
  python scripts/cluster_normies.py
  python scripts/cluster_normies.py --k 16
  python scripts/cluster_normies.py --k-min 2 --k-max 30
  python scripts/cluster_normies.py --input frontend/public/normies/pixels.json --limit 500
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics import silhouette_score

# Reuse pixel loading / Hamming from build_tree.py
_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))
from build_tree import hamming_row, load_pixels, repo_root  # noqa: E402


def resolve_pixels_path(explicit: Path | None) -> Path:
    if explicit is not None:
        return explicit
    root = repo_root()
    for candidate in (
        root / "data" / "pixels.json",
        root / "frontend" / "public" / "normies" / "pixels.json",
    ):
        if candidate.exists():
            return candidate
    raise FileNotFoundError("No pixels.json found. Pass --input.")


def distance_matrix(packed: np.ndarray) -> np.ndarray:
    """Full symmetric Hamming distance matrix (n × n, float32)."""
    n = len(packed)
    d = np.zeros((n, n), dtype=np.float32)
    for i in range(n):
        if i % max(1, n // 20) == 0:
            print(f"  distances: row {i}/{n}", flush=True)
        d[i] = hamming_row(i, packed).astype(np.float32)
    return d


def cluster_medoid_index(cluster_indices: list[int], dist: np.ndarray) -> int:
    """Index (into full dataset) of the cluster medoid."""
    if len(cluster_indices) == 1:
        return cluster_indices[0]
    sub = dist[np.ix_(cluster_indices, cluster_indices)]
    local = int(np.argmin(sub.sum(axis=1)))
    return cluster_indices[local]


def medoids_for_labels(
    labels: np.ndarray,
    dist: np.ndarray,
    k: int,
) -> dict[str, int]:
    """Map cluster id -> dataset index of medoid."""
    out: dict[str, int] = {}
    for c in range(k):
        members = np.where(labels == c)[0].tolist()
        if not members:
            continue
        out[str(c)] = cluster_medoid_index(members, dist)
    return out


def medoid_token_ids(medoid_indices: dict[str, int], ids: list[int]) -> dict[str, int]:
    return {str(c): ids[idx] for c, idx in medoid_indices.items()}


def cluster_sizes(labels: np.ndarray, k: int) -> dict[str, int]:
    unique, counts = np.unique(labels, return_counts=True)
    sizes = {str(int(u)): int(c) for u, c in zip(unique, counts)}
    for c in range(k):
        sizes.setdefault(str(c), 0)
    return sizes


def sweep_k(
    dist: np.ndarray,
    k_min: int,
    k_max: int,
) -> tuple[int, dict[str, float]]:
    """Try k = k_min..k_max; return best k and silhouette per k."""
    scores: dict[str, float] = {}
    best_k = k_min
    best_score = -1.0

    for k in range(k_min, k_max + 1):
        print(f"  clustering k={k}...", flush=True)
        model = AgglomerativeClustering(
            n_clusters=k,
            metric="precomputed",
            linkage="average",
        )
        labels = model.fit_predict(dist)
        # Silhouette needs at least 2 clusters and not all singletons
        if len(np.unique(labels)) < 2:
            scores[str(k)] = -1.0
            continue
        score = float(silhouette_score(dist, labels, metric="precomputed"))
        scores[str(k)] = round(score, 6)
        print(f"    silhouette={score:.4f}", flush=True)
        if score > best_score:
            best_score = score
            best_k = k

    return best_k, scores


def main() -> int:
    parser = argparse.ArgumentParser(description="Cluster Normies by pixel Hamming distance")
    parser.add_argument("--input", type=Path, default=None, help="pixels.json path")
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="clusters.json output (default: data/clusters.json)",
    )
    parser.add_argument("--limit", type=int, default=None, help="First N sorted token ids only")
    parser.add_argument(
        "--k",
        type=int,
        default=None,
        help="Fixed cluster count (skip silhouette sweep)",
    )
    parser.add_argument("--k-min", type=int, default=2, help="Min k for sweep (default: 2)")
    parser.add_argument("--k-max", type=int, default=30, help="Max k for sweep (default: 30)")
    args = parser.parse_args()

    try:
        in_path = resolve_pixels_path(args.input)
    except FileNotFoundError as e:
        print(e, file=sys.stderr)
        return 1

    root = repo_root()
    out_path = args.output or (root / "data" / "clusters.json")

    t0 = time.perf_counter()
    print(f"Loading {in_path}...")
    ids, packed = load_pixels(in_path, args.limit)
    n = len(ids)
    if n < 2:
        print("Need at least 2 normies to cluster.", file=sys.stderr)
        return 1
    print(f"  {n} normies ({time.perf_counter() - t0:.1f}s)")

    print("Building Hamming distance matrix...")
    t1 = time.perf_counter()
    dist = distance_matrix(packed)
    print(f"  done in {time.perf_counter() - t1:.1f}s")

    silhouette_by_k: dict[str, float] = {}
    if args.k is not None:
        k = args.k
        if k < 2 or k > n:
            print(f"--k must be between 2 and {n}", file=sys.stderr)
            return 1
        print(f"Clustering with fixed k={k}...")
        labels = AgglomerativeClustering(
            n_clusters=k,
            metric="precomputed",
            linkage="average",
        ).fit_predict(dist)
        sil = float(silhouette_score(dist, labels, metric="precomputed"))
        silhouette_by_k[str(k)] = round(sil, 6)
        print(f"  silhouette={sil:.4f}")
    else:
        k_max = min(args.k_max, n - 1)
        k_min = max(2, min(args.k_min, k_max))
        print(f"Sweeping k={k_min}..{k_max} (silhouette)...")
        k, silhouette_by_k = sweep_k(dist, k_min, k_max)
        labels = AgglomerativeClustering(
            n_clusters=k,
            metric="precomputed",
            linkage="average",
        ).fit_predict(dist)
        print(f"  selected k={k} (best silhouette)")

    medoid_idx = medoids_for_labels(labels, dist, k)
    medoid_tokens = medoid_token_ids(medoid_idx, ids)
    sizes = cluster_sizes(labels, k)

    result = {
        "version": 1,
        "method": "agglomerative_average",
        "metric": "hamming",
        "k": k,
        "count": n,
        "ids": ids,
        "labels": labels.tolist(),
        "clusterMedoidIndex": medoid_idx,
        "clusterMedoids": medoid_tokens,
        "clusterSizes": sizes,
        "silhouette": silhouette_by_k.get(str(k)),
        "silhouetteByK": silhouette_by_k,
        "source": str(in_path.relative_to(root)) if in_path.is_relative_to(root) else str(in_path),
        "builtAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(result, f, separators=(",", ":"))
        f.write("\n")

    size_mb = out_path.stat().st_size / (1024 * 1024)
    print(f"Wrote {out_path} ({size_mb:.2f} MB)")
    print(f"  k={k}, silhouette={result['silhouette']}")
    for c in range(k):
        tid = medoid_tokens.get(str(c))
        print(f"  cluster {c}: size={sizes.get(str(c), 0)}, medoid=#{tid}")
    print(f"Total time: {time.perf_counter() - t0:.1f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
