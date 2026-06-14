#!/usr/bin/env python3
"""
Fetch all customized Normies and cache their composited pixel data.

1. OpenSea API v2 — list NFTs in collection `normies` with trait Customized = Yes
2. Normies API — GET /normie/{id}/pixels (composited canvas pixels)
3. Write data/pixels-diff.json (token id -> 1600-char string)

Requires OPENSEA_API_KEY (https://docs.opensea.io/reference/api-keys).
Normies API: 60 req/min — default 1.1s delay between pixel fetches.

Setup:
  export OPENSEA_API_KEY=your_key
  source .venv/bin/activate
  pip install -r requirements.txt
  python scripts/fetch_customized_pixels.py
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.parse
from pathlib import Path

import requests

NORMIES_API = "https://api.normies.art"
OPENSEA_API = "https://api.opensea.io/api/v2"
DEFAULT_SLUG = "normies"
DEFAULT_DELAY = 1.1
PIXEL_LEN = 1600
TRAITS_FILTER = [{"traitType": "Customized", "value": "Yes"}]


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def output_path(root: Path) -> Path:
    return root / "data" / "pixels-diff.json"


def manifest_path(root: Path) -> Path:
    return root / "data" / "pixels_diff_manifest.json"


def load_manifest(path: Path) -> dict:
    if path.exists():
        with path.open(encoding="utf-8") as f:
            return json.load(f)
    return {
        "opensea_ids": [],
        "completed": {},
        "failed": {},
        "fetched_at": None,
    }


def save_manifest(path: Path, manifest: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)


def load_pixels(path: Path) -> dict[str, str]:
    if path.exists():
        with path.open(encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_pixels(path: Path, pixels: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(pixels, f, separators=(",", ":"))
        f.write("\n")


def fetch_customized_ids(
    session: requests.Session,
    slug: str,
    api_key: str,
) -> list[int]:
    """Paginate OpenSea collection NFTs filtered to Customized = Yes."""
    headers = {
        "Accept": "application/json",
        "X-API-KEY": api_key,
    }
    traits_json = json.dumps(TRAITS_FILTER, separators=(",", ":"))
    url: str | None = f"{OPENSEA_API}/collection/{slug}/nfts"
    params: dict | None = {"traits": traits_json, "limit": 200}

    ids: list[int] = []
    page = 0

    while url:
        page += 1
        r = session.get(url, headers=headers, params=params, timeout=60)
        params = None  # only on first request; `next` URLs include query string
        if r.status_code == 429:
            print("  OpenSea rate limit (429), waiting 30s...", flush=True)
            time.sleep(30)
            continue
        r.raise_for_status()
        data = r.json()

        nfts = data.get("nfts") or []
        for nft in nfts:
            raw_id = nft.get("identifier") or nft.get("token_id") or nft.get("tokenId")
            if raw_id is None:
                continue
            token_id = int(str(raw_id))
            if 0 <= token_id <= 9999:
                ids.append(token_id)

        next_page = data.get("next")
        if not next_page:
            url = None
        elif str(next_page).startswith("http"):
            url = str(next_page)
        else:
            url = (
                f"{OPENSEA_API}/collection/{slug}/nfts"
                f"?traits={urllib.parse.quote(traits_json)}"
                f"&limit=200&next={urllib.parse.quote(str(next_page))}"
            )

        print(f"  OpenSea page {page}: +{len(nfts)} nfts ({len(ids)} customized so far)", flush=True)

    return sorted(set(ids))


def fetch_composited_pixels(session: requests.Session, token_id: int) -> str:
    url = f"{NORMIES_API}/normie/{token_id}/pixels"
    r = session.get(url, timeout=60)
    if r.status_code == 429:
        raise RuntimeError("Normies API rate limit exceeded (429)")
    if r.status_code == 404:
        raise FileNotFoundError(f"token {token_id} not found")
    r.raise_for_status()
    text = r.text.strip()
    if len(text) != PIXEL_LEN or any(c not in "01" for c in text):
        raise ValueError(f"token {token_id}: expected {PIXEL_LEN} chars of 0/1, got {len(text)}")
    return text


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch customized Normie pixels via OpenSea + Normies API",
    )
    parser.add_argument(
        "--slug",
        default=DEFAULT_SLUG,
        help=f"OpenSea collection slug (default: {DEFAULT_SLUG})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output JSON path (default: data/pixels-diff.json)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=DEFAULT_DELAY,
        help="Seconds between Normies API pixel requests",
    )
    parser.add_argument(
        "--skip-opensea",
        action="store_true",
        help="Skip OpenSea fetch; use ids already stored in manifest",
    )
    parser.add_argument(
        "--retry-failed",
        action="store_true",
        help="Re-attempt ids listed in manifest failed",
    )
    args = parser.parse_args()

    api_key = os.environ.get("OPENSEA_API_KEY", "").strip()
    if not args.skip_opensea and not api_key:
        print(
            "Set OPENSEA_API_KEY (https://docs.opensea.io/reference/api-keys)",
            file=sys.stderr,
        )
        return 1

    root = repo_root()
    out_file = args.output or output_path(root)
    manifest_file = manifest_path(root)
    manifest = load_manifest(manifest_file)
    pixels = load_pixels(out_file)

    opensea_session = requests.Session()
    opensea_session.headers["User-Agent"] = "normies-customized-fetch/1.0"

    normies_session = requests.Session()
    normies_session.headers["User-Agent"] = "normies-customized-fetch/1.0"

    if args.skip_opensea:
        ids = [int(k) for k in manifest.get("opensea_ids", [])]
        if not ids:
            print("No opensea_ids in manifest — run without --skip-opensea first", file=sys.stderr)
            return 1
        print(f"Using {len(ids)} ids from manifest")
    else:
        print(f"Fetching customized Normies from OpenSea collection '{args.slug}'...")
        ids = fetch_customized_ids(opensea_session, args.slug, api_key)
        manifest["opensea_ids"] = ids
        manifest["fetched_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        save_manifest(manifest_file, manifest)
        print(f"Found {len(ids)} customized Normies on OpenSea")

    if not ids:
        print("No customized Normies found.")
        save_pixels(out_file, pixels)
        return 0

    pending = []
    for token_id in ids:
        key = str(token_id)
        if key in manifest["completed"] and key in pixels:
            continue
        if not args.retry_failed and key in manifest.get("failed", {}):
            continue
        pending.append(token_id)

    total = len(pending)
    if total == 0:
        print(f"All {len(ids)} customized pixels already cached in {out_file}")
        return 0

    eta_min = total * args.delay / 60
    print(f"Fetching {total} composited pixel strings (~{eta_min:.1f} min at {args.delay}s/req)")
    print(f"Writing to {out_file}")

    ok = 0
    for n, token_id in enumerate(pending, 1):
        key = str(token_id)
        while True:
            try:
                bits = fetch_composited_pixels(normies_session, token_id)
                pixels[key] = bits
                manifest["completed"][key] = {
                    "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }
                manifest["failed"].pop(key, None)
                save_pixels(out_file, pixels)
                save_manifest(manifest_file, manifest)
                ok += 1
                if n % 10 == 0 or n == total:
                    print(f"  [{n}/{total}] id={token_id} ok={ok}", flush=True)
                break
            except FileNotFoundError as e:
                manifest["failed"][key] = str(e)
                save_manifest(manifest_file, manifest)
                print(f"  id={token_id} skipped: {e}", flush=True)
                break
            except Exception as e:
                print(f"  id={token_id} error: {e}, retry in 30s...", flush=True)
                time.sleep(30)

        if n < total:
            time.sleep(args.delay)

    print(f"Done. {ok}/{total} pixels fetched. Output: {out_file}")
    if manifest.get("failed"):
        print(f"  {len(manifest['failed'])} failed/skipped — see {manifest_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
