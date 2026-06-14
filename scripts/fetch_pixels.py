#!/usr/bin/env python3
"""
Download all Normie original pixel strings and cache locally.

Uses GET /normie/{id}/original/pixels (pre-Canvas, on-chain art).
Respects API rate limit (60 req/min) with a 1.1s delay between requests.
Safe to interrupt and resume via data/manifest.json.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import requests

BASE_URL = "https://api.normies.art"
PIXEL_LEN = 1600
DEFAULT_DELAY = 1.1  # seconds between requests (~54/min)


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def pixels_dir(root: Path) -> Path:
    d = root / "data" / "pixels"
    d.mkdir(parents=True, exist_ok=True)
    return d


def manifest_path(root: Path) -> Path:
    return root / "data" / "manifest.json"


def load_manifest(path: Path) -> dict:
    if path.exists():
        with path.open(encoding="utf-8") as f:
            return json.load(f)
    return {"completed": {}, "failed": {}}


def save_manifest(path: Path, manifest: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)


def fetch_pixels(session: requests.Session, token_id: int) -> str:
    url = f"{BASE_URL}/normie/{token_id}/original/pixels"
    r = session.get(url, timeout=60)
    if r.status_code == 429:
        raise RuntimeError("rate limit exceeded (429)")
    r.raise_for_status()
    text = r.text.strip()
    if len(text) != PIXEL_LEN or any(c not in "01" for c in text):
        raise ValueError(f"token {token_id}: expected {PIXEL_LEN} chars of 0/1, got {len(text)}")
    return text


def main() -> int:
    parser = argparse.ArgumentParser(description="Cache Normie original pixel data locally")
    parser.add_argument("--start", type=int, default=0, help="First token id (inclusive)")
    parser.add_argument("--end", type=int, default=9999, help="Last token id (inclusive)")
    parser.add_argument("--delay", type=float, default=DEFAULT_DELAY, help="Seconds between requests")
    parser.add_argument("--retry-failed", action="store_true", help="Re-attempt ids in manifest failed")
    args = parser.parse_args()

    if not (0 <= args.start <= args.end <= 9999):
        print("id range must be within 0..9999", file=sys.stderr)
        return 1

    root = repo_root()
    out_dir = pixels_dir(root)
    manifest_file = manifest_path(root)
    manifest = load_manifest(manifest_file)

    session = requests.Session()
    session.headers["User-Agent"] = "normies-tree-builder/1.0"

    ids = list(range(args.start, args.end + 1))
    if not args.retry_failed:
        ids = [i for i in ids if str(i) not in manifest["completed"]]

    total = len(ids)
    if total == 0:
        print("Nothing to fetch — all ids in range already cached.")
        return 0

    eta_min = total * args.delay / 60
    print(f"Fetching {total} normies ({args.start}..{args.end}), ~{eta_min:.0f} min at {args.delay}s/req")
    print(f"Writing to {out_dir}")

    ok = 0
    for n, token_id in enumerate(ids, 1):
        out_file = out_dir / f"{token_id:05d}.txt"
        if out_file.exists() and str(token_id) in manifest["completed"]:
            ok += 1
            continue

        while True:
            try:
                pixels = fetch_pixels(session, token_id)
                out_file.write_text(pixels, encoding="utf-8")
                manifest["completed"][str(token_id)] = {
                    "path": str(out_file.relative_to(root)),
                    "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }
                manifest["failed"].pop(str(token_id), None)
                save_manifest(manifest_file, manifest)
                ok += 1
                if n % 10 == 0 or n == total:
                    print(f"  [{n}/{total}] id={token_id} ok={ok}")
                break
            except Exception as e:
                print(f"  id={token_id} error: {e}, retry in 30s...")
                time.sleep(30)

        if n < total:
            time.sleep(args.delay)

    print(f"Done. {ok}/{total} in this run. manifest: {manifest_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
