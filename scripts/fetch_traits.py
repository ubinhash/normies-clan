#!/usr/bin/env python3
"""
Download all Normie traits via the Normies API.

Uses GET /normie/{id}/traits (decoded mint traits + raw bytes8 hex).
Respects API rate limit (60 req/min) with a 1.1s delay between requests.
Safe to interrupt and resume via data/traits_manifest.json.

Setup:
  source .venv/bin/activate
  pip install -r requirements.txt
  python scripts/fetch_traits.py
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import requests

BASE_URL = "https://api.normies.art"
DEFAULT_DELAY = 1.1  # seconds between requests (~54/min)

TRAIT_TYPES = (
    "Type",
    "Gender",
    "Age",
    "Hair Style",
    "Facial Feature",
    "Eyes",
    "Expression",
    "Accessory",
)


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def manifest_path(root: Path) -> Path:
    return root / "data" / "traits_manifest.json"


def output_path(root: Path) -> Path:
    return root / "data" / "traits.json"


def load_manifest(path: Path) -> dict:
    if path.exists():
        with path.open(encoding="utf-8") as f:
            return json.load(f)
    return {"completed": {}, "failed": {}}


def save_manifest(path: Path, manifest: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)


def load_traits(path: Path) -> dict[str, dict]:
    if path.exists():
        with path.open(encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_traits(path: Path, traits: dict[str, dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(traits, f, separators=(",", ":"))
        f.write("\n")


def normalize_traits(data: dict) -> dict:
    """Flatten attributes into top-level keys for easy lookup."""
    out = {"raw": data.get("raw"), "attributes": data.get("attributes", [])}
    for attr in out["attributes"]:
        if "trait_type" in attr and "value" in attr:
            out[attr["trait_type"]] = attr["value"]
    return out


def fetch_traits(session: requests.Session, token_id: int) -> dict:
    url = f"{BASE_URL}/normie/{token_id}/traits"
    r = session.get(url, timeout=60)
    if r.status_code == 429:
        raise RuntimeError("rate limit exceeded (429)")
    if r.status_code == 404:
        raise FileNotFoundError(f"token {token_id} not found")
    r.raise_for_status()
    data = r.json()
    if "attributes" not in data:
        raise ValueError(f"token {token_id}: missing attributes in response")
    return normalize_traits(data)


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch Normie traits from the Normies API")
    parser.add_argument("--start", type=int, default=0, help="First token id (inclusive)")
    parser.add_argument("--end", type=int, default=9999, help="Last token id (inclusive)")
    parser.add_argument("--delay", type=float, default=DEFAULT_DELAY, help="Seconds between requests")
    parser.add_argument("--retry-failed", action="store_true", help="Re-attempt ids in manifest failed")
    args = parser.parse_args()

    if not (0 <= args.start <= args.end <= 9999):
        print("id range must be within 0..9999", file=sys.stderr)
        return 1

    root = repo_root()
    manifest_file = manifest_path(root)
    traits_file = output_path(root)
    manifest = load_manifest(manifest_file)
    traits = load_traits(traits_file)

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
    print(f"Writing to {traits_file}")

    ok = 0
    for n, token_id in enumerate(ids, 1):
        key = str(token_id)
        if key in manifest["completed"] and key in traits:
            ok += 1
            continue

        while True:
            try:
                entry = fetch_traits(session, token_id)
                traits[key] = entry
                manifest["completed"][key] = {
                    "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }
                manifest["failed"].pop(key, None)
                save_traits(traits_file, traits)
                save_manifest(manifest_file, manifest)
                ok += 1
                if n % 10 == 0 or n == total:
                    print(f"  [{n}/{total}] id={token_id} ok={ok}")
                break
            except FileNotFoundError as e:
                manifest["failed"][key] = str(e)
                save_manifest(manifest_file, manifest)
                print(f"  id={token_id} skipped: {e}")
                break
            except Exception as e:
                print(f"  id={token_id} error: {e}, retry in 30s...")
                time.sleep(30)

        if n < total:
            time.sleep(args.delay)

    print(f"Done. {ok}/{total} in this run. Output: {traits_file}")
    if manifest["failed"]:
        print(f"  {len(manifest['failed'])} failed/skipped — see {manifest_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
