#!/usr/bin/env python3
"""
Pack cached 1600-char pixel strings into a single binary file for fast Hamming distance.

Format: 10000 records × 200 bytes each (MSB-first, row-major, 8 pixels per byte).
Record i is at offset i * 200 in data/pixels.bin.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

PIXEL_LEN = 1600
BYTES_PER = 200
NUM_TOKENS = 10000


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def pack_string(bits: str) -> bytes:
    if len(bits) != PIXEL_LEN:
        raise ValueError(f"expected {PIXEL_LEN} bits, got {len(bits)}")
    out = bytearray(BYTES_PER)
    for i, ch in enumerate(bits):
        if ch not in "01":
            raise ValueError(f"invalid char {ch!r} at {i}")
        if ch == "1":
            out[i // 8] |= 1 << (7 - (i % 8))
    return bytes(out)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--end", type=int, default=9999)
    args = parser.parse_args()

    root = repo_root()
    pixels_dir = root / "data" / "pixels"
    out_path = root / "data" / "pixels.bin"

    if not pixels_dir.exists():
        print(f"Missing {pixels_dir} — run fetch_pixels.py first", file=sys.stderr)
        return 1

    # Load existing file if present (for partial pack)
    buf = bytearray(NUM_TOKENS * BYTES_PER)
    if out_path.exists() and out_path.stat().st_size == len(buf):
        buf[:] = out_path.read_bytes()

    packed = 0
    for token_id in range(args.start, args.end + 1):
        path = pixels_dir / f"{token_id:05d}.txt"
        if not path.exists():
            continue
        bits = path.read_text(encoding="utf-8").strip()
        buf[token_id * BYTES_PER : (token_id + 1) * BYTES_PER] = pack_string(bits)
        packed += 1

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(buf)
    print(f"Packed {packed} tokens into {out_path} ({len(buf)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
