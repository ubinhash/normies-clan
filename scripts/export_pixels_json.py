#!/usr/bin/env python3
"""
Merge data/pixels/*.txt into one JSON object: token id -> 1600-char pixel string.

Example output (data/pixels.json):
  {
    "0": "000...",
    "1": "111...",
    ...
  }
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

PIXEL_LEN = 1600
FILENAME_RE = re.compile(r"^(\d{1,5})\.txt$")


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def collect_pixels(pixels_dir: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not pixels_dir.is_dir():
        raise FileNotFoundError(f"Missing directory: {pixels_dir}")

    for path in sorted(pixels_dir.glob("*.txt")):
        m = FILENAME_RE.match(path.name)
        if not m:
            continue
        token_id = str(int(m.group(1)))  # "00042" -> "42"
        bits = path.read_text(encoding="utf-8").strip()
        if len(bits) != PIXEL_LEN:
            raise ValueError(f"{path}: expected {PIXEL_LEN} chars, got {len(bits)}")
        if any(c not in "01" for c in bits):
            raise ValueError(f"{path}: must contain only 0 and 1")
        out[token_id] = bits
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Export cached pixels to a single JSON file")
    parser.add_argument(
        "--input",
        type=Path,
        default=None,
        help="Pixels directory (default: data/pixels)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Output JSON path (default: data/pixels.json)",
    )
    parser.add_argument("--pretty", action="store_true", help="Indent JSON (larger file)")
    parser.add_argument(
        "--missing",
        action="store_true",
        help="Print ids in 0..9999 that have no file (to stderr)",
    )
    args = parser.parse_args()

    root = repo_root()
    pixels_dir = args.input or (root / "data" / "pixels")
    out_path = args.output or (root / "data" / "pixels.json")

    try:
        data = collect_pixels(pixels_dir)
    except (FileNotFoundError, ValueError) as e:
        print(e, file=sys.stderr)
        return 1

    if not data:
        print(f"No .txt files in {pixels_dir}", file=sys.stderr)
        return 1

    if args.missing:
        have = {int(k) for k in data}
        missing = [i for i in range(10000) if i not in have]
        if missing:
            print(f"Missing {len(missing)} ids (0..9999)", file=sys.stderr)
            if len(missing) <= 50:
                print(missing, file=sys.stderr)
            else:
                print(f"  first: {missing[:10]} ... last: {missing[-10:]}", file=sys.stderr)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        if args.pretty:
            json.dump(data, f, indent=2)
        else:
            json.dump(data, f, separators=(",", ":"))
        f.write("\n")

    ids = sorted(int(k) for k in data)
    size_mb = out_path.stat().st_size / (1024 * 1024)
    print(f"Wrote {len(data)} normies to {out_path} ({size_mb:.1f} MB)")
    print(f"  id range: {ids[0]} .. {ids[-1]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())