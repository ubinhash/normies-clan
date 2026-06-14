#!/usr/bin/env python3
"""
Fetch Normie traits from on-chain tokenURI() metadata.

Calls Normies.tokenURI(id) on Ethereum mainnet, decodes the data: URI JSON,
and extracts the 8 mint trait categories. Resume-safe via data/traits_manifest.json.

Requires ETH_RPC_URL (e.g. Alchemy/Infura mainnet endpoint).

Setup:
  cd /path/to/normies
  source .venv/bin/activate
  pip install -r requirements.txt
  export ETH_RPC_URL="https://..."
  python scripts/fetch_traits_onchain.py
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
import urllib.parse
from pathlib import Path

import requests
from eth_abi import decode
from web3 import Web3

NORMIES = Web3.to_checksum_address("0x9Eb6E2025B64f340691e424b7fe7022fFDE12438")
TOKEN_URI_SELECTOR = Web3.keccak(text="tokenURI(uint256)")[:4].hex()

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

DEFAULT_BATCH = 100


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


def encode_token_uri_call(token_id: int) -> str:
    return "0x" + TOKEN_URI_SELECTOR + f"{token_id:064x}"


def decode_string_result(hex_data: str) -> str:
    raw = bytes.fromhex(hex_data[2:] if hex_data.startswith("0x") else hex_data)
    if not raw:
        raise ValueError("empty eth_call result")
    return decode(["string"], raw)[0]


def parse_token_uri(uri: str) -> dict:
    if uri.startswith("data:application/json;base64,"):
        payload = base64.b64decode(uri.split(",", 1)[1])
        return json.loads(payload)
    if uri.startswith("data:application/json,"):
        payload = urllib.parse.unquote(uri.split(",", 1)[1])
        return json.loads(payload)
    raise ValueError(f"unsupported tokenURI scheme: {uri[:64]}...")


def traits_from_metadata(metadata: dict) -> dict:
    by_type = {
        attr["trait_type"]: attr["value"]
        for attr in metadata.get("attributes", [])
        if "trait_type" in attr and "value" in attr
    }
    traits = {key: by_type[key] for key in TRAIT_TYPES if key in by_type}
    attributes = [{"trait_type": k, "value": traits[k]} for k in TRAIT_TYPES if k in traits]
    return {"attributes": attributes, **traits}


def rpc_batch(rpc_url: str, token_ids: list[int], timeout: float) -> dict[int, str]:
    payload = [
        {
            "jsonrpc": "2.0",
            "id": token_id,
            "method": "eth_call",
            "params": [
                {"to": NORMIES, "data": encode_token_uri_call(token_id)},
                "latest",
            ],
        }
        for token_id in token_ids
    ]
    r = requests.post(rpc_url, json=payload, timeout=timeout)
    r.raise_for_status()
    results = r.json()
    if not isinstance(results, list):
        raise RuntimeError(f"expected JSON-RPC batch array, got: {type(results)}")

    out: dict[int, str] = {}
    for item in results:
        token_id = item["id"]
        if "error" in item:
            raise RuntimeError(f"token {token_id}: {item['error']}")
        out[token_id] = decode_string_result(item["result"])
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch Normie traits via on-chain tokenURI")
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--end", type=int, default=9999)
    parser.add_argument("--batch", type=int, default=DEFAULT_BATCH, help="RPC batch size")
    parser.add_argument("--retry-failed", action="store_true")
    parser.add_argument(
        "--rpc",
        default=os.environ.get("ETH_RPC_URL"),
        help="Ethereum RPC URL (default: ETH_RPC_URL env)",
    )
    args = parser.parse_args()

    if not args.rpc:
        print("Set ETH_RPC_URL or pass --rpc", file=sys.stderr)
        return 1
    if not (0 <= args.start <= args.end <= 9999):
        print("id range must be within 0..9999", file=sys.stderr)
        return 1
    if args.batch < 1:
        print("--batch must be >= 1", file=sys.stderr)
        return 1

    root = repo_root()
    manifest_file = manifest_path(root)
    traits_file = output_path(root)
    manifest = load_manifest(manifest_file)
    traits = load_traits(traits_file)

    ids = list(range(args.start, args.end + 1))
    if not args.retry_failed:
        ids = [i for i in ids if str(i) not in manifest["completed"]]

    total = len(ids)
    if total == 0:
        print("Nothing to fetch — all ids in range already cached.")
        return 0

    batches = (total + args.batch - 1) // args.batch
    print(f"Fetching {total} tokenURIs ({args.start}..{args.end}) in {batches} batches")
    print(f"Writing to {traits_file}")

    ok = 0
    for batch_idx in range(batches):
        chunk = ids[batch_idx * args.batch : (batch_idx + 1) * args.batch]
        while True:
            try:
                uris = rpc_batch(args.rpc, chunk, timeout=120)
                break
            except Exception as e:
                print(f"  batch {batch_idx + 1}/{batches} error: {e}, retry in 10s...")
                time.sleep(10)

        for token_id in chunk:
            key = str(token_id)
            try:
                metadata = parse_token_uri(uris[token_id])
                entry = traits_from_metadata(metadata)
                traits[key] = entry
                manifest["completed"][key] = {
                    "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }
                manifest["failed"].pop(key, None)
                ok += 1
            except Exception as e:
                manifest["failed"][key] = str(e)
                print(f"  id={token_id} parse error: {e}")

        save_traits(traits_file, traits)
        save_manifest(manifest_file, manifest)
        print(f"  batch {batch_idx + 1}/{batches} done ({ok}/{total})")

    print(f"Done. {ok}/{total} in this run. Output: {traits_file}")
    if manifest["failed"]:
        print(f"  {len(manifest['failed'])} failed — rerun with --retry-failed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
