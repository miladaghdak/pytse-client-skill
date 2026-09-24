#!/usr/bin/env python3
"""Retail (حقیقی) vs institutional (حقوقی) daily flow as JSON."""
from __future__ import annotations

import argparse

from pytse_client import download_client_types_records

from _jsonio import emit, fail, frame_records, quiet


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Download client-types records for one ticker"
    )
    parser.add_argument("symbol", help="Persian ticker")
    parser.add_argument(
        "--csv", action="store_true", help="cache to ./client_types_data/"
    )
    parser.add_argument("--jdate", action="store_true", help="add Jalali date column")
    args = parser.parse_args()

    try:
        with quiet():
            frames = download_client_types_records(
                args.symbol,
                write_to_csv=args.csv,
                include_jdate=args.jdate,
            )
    except Exception as exc:
        fail(exc, tool="download_client_types", symbol=args.symbol)

    df = frames.get(args.symbol)
    if df is None:
        # upstream silently skips fetches that come back empty -- surface it
        fail(
            f"no client-types records returned for {args.symbol}",
            tool="download_client_types",
            symbol=args.symbol,
            missing=[args.symbol],
        )

    emit(
        {
            "ok": True,
            "source": "pytse-client",
            "tool": "download_client_types",
            "symbol": args.symbol,
            "rows": frame_records(df),
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
