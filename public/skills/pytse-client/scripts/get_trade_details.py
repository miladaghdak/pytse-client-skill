#!/usr/bin/env python3
"""Historical ticks or aggregated intraday bars for one ticker.

get_trade_details(aggregate=True) returns {"aggregate": DataFrame} -- a
dict, NOT a bare DataFrame -- and the frame is datetime-indexed.
"""
from __future__ import annotations

import argparse
from datetime import date

import pytse_client as tse

from _jsonio import emit, fail, frame_records, quiet


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Trade details (ticks or resampled bars) for a date range"
    )
    parser.add_argument("symbol", help="Persian ticker")
    parser.add_argument("start", help="start date YYYY-MM-DD")
    parser.add_argument("end", nargs="?", help="end date YYYY-MM-DD (default: start)")
    parser.add_argument(
        "--timeframe",
        choices=["30s", "1m", "5m", "10m", "15m", "30m", "1h"],
        default=None,
        help="resample to OHLCV bars (default: raw ticks)",
    )
    parser.add_argument(
        "--csv", action="store_true", help="cache to ./trade_details_history/"
    )
    args = parser.parse_args()

    try:
        start = date.fromisoformat(args.start)
        end = date.fromisoformat(args.end) if args.end else None
    except ValueError as exc:
        fail(exc, tool="get_trade_details", hint="dates must be YYYY-MM-DD")

    try:
        with quiet():
            result = tse.get_trade_details(
                args.symbol,
                start,
                end,
                to_csv=args.csv,
                aggregate=True,
                timeframe=args.timeframe,
            )
    except Exception as exc:
        fail(
            exc,
            tool="get_trade_details",
            symbol=args.symbol,
            hint="the range may contain no trade days with data",
        )

    df = result.get("aggregate")
    if df is None or df.empty:
        fail(
            f"no trade details for {args.symbol} between "
            f"{args.start} and {args.end or args.start}",
            tool="get_trade_details",
            symbol=args.symbol,
        )

    emit(
        {
            "ok": True,
            "source": "pytse-client",
            "tool": "get_trade_details",
            "symbol": args.symbol,
            "start": args.start,
            "end": args.end,
            "timeframe": args.timeframe,
            "row_count": int(len(df)),
            "rows": frame_records(df),
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
