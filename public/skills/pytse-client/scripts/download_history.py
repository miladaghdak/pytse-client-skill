#!/usr/bin/env python3
"""Download TSE daily OHLCV history as one JSON object on stdout."""
from __future__ import annotations

import argparse

import pytse_client as tse

from _jsonio import emit, fail, frame_records, quiet


def main() -> int:
    parser = argparse.ArgumentParser(description="Download TSE daily history")
    parser.add_argument(
        "symbol", nargs="?", help="Persian ticker, or omit with --all"
    )
    parser.add_argument("--all", action="store_true", help="every symbol (~1,394)")
    parser.add_argument(
        "--adjust", action="store_true", help="price-adjusted series ({symbol}-ت.csv)"
    )
    parser.add_argument("--jdate", action="store_true", help="add Jalali date column")
    parser.add_argument(
        "--csv", action="store_true", help="cache to ./tickers_data/{symbol}.csv"
    )
    args = parser.parse_args()

    symbols = "all" if args.all else args.symbol
    if not symbols:
        parser.error("symbol or --all is required")

    try:
        with quiet():
            frames = tse.download(
                symbols=symbols,
                write_to_csv=args.csv,
                include_jdate=args.jdate,
                adjust=args.adjust,
            )
    except Exception as exc:
        fail(exc, tool="download_history")

    requested = (
        sorted(tse.symbols_data.all_symbols()) if args.all else [symbols]
    )
    missing = [name for name in requested if name not in frames]
    emit(
        {
            "ok": True,
            "source": "pytse-client",
            "tool": "download_history",
            "adjust": args.adjust,
            "include_jdate": args.jdate,
            "symbols": {
                name: frame_records(df) for name, df in frames.items()
            },
            "missing": missing,
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
