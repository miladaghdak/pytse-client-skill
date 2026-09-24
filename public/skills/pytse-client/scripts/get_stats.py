#!/usr/bin/env python3
"""Key stats + market watch + client types table for filter-writing.

One row per symbol, ~120 columns (فیلترنویسی keys, client-type flow and
market-watch fields). Values are strings as served by TSETMC.
"""
from __future__ import annotations

import argparse

from pytse_client import get_stats

from _jsonio import emit, fail, frame_records, quiet


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Market-wide stats table for فیلترنویسی filters"
    )
    parser.add_argument(
        "--csv", action="store_true", help="cache to ./pytse_client_key_stats/"
    )
    args = parser.parse_args()

    try:
        with quiet():
            df = get_stats(to_csv=args.csv)
    except Exception as exc:
        fail(exc, tool="get_stats")

    emit(
        {
            "ok": True,
            "source": "pytse-client",
            "tool": "get_stats",
            "row_count": int(len(df)),
            "rows": frame_records(df),
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
