#!/usr/bin/env python3
"""Historical five-level order book as JSON keyed by date.

Each day's frame is datetime-indexed; the timestamps are surfaced as an
explicit ``datetime`` column (orient="records" would drop them).
"""
from __future__ import annotations

import argparse
from datetime import date, timedelta

from pytse_client import get_orderbook

from _jsonio import emit, fail, frame_records, quiet

# TSE trades Saturday to Wednesday (Python weekday(): Mon=0 ... Sat=5, Sun=6)
TRADING_WEEKDAYS = {0, 1, 2, 5, 6}


def _expected_days(start: date, end: date) -> list[str]:
    days = []
    cursor = start
    while cursor <= end:
        if cursor.weekday() in TRADING_WEEKDAYS:
            days.append(cursor.isoformat())
        cursor += timedelta(days=1)
    return days


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Reconstructed five-level order book per trade day"
    )
    parser.add_argument("symbol", help="Persian ticker")
    parser.add_argument("start", help="start date YYYY-MM-DD")
    parser.add_argument("end", nargs="?", help="end date YYYY-MM-DD (default: start)")
    parser.add_argument(
        "--diff",
        action="store_true",
        help="store only row changes (smaller, faster payload)",
    )
    parser.add_argument(
        "--csv", action="store_true", help="cache to ./orderbook_history/"
    )
    args = parser.parse_args()

    try:
        start = date.fromisoformat(args.start)
        end = date.fromisoformat(args.end) if args.end else None
    except ValueError as exc:
        fail(exc, tool="get_orderbook", hint="dates must be YYYY-MM-DD")

    try:
        with quiet():
            raw = get_orderbook(
                args.symbol,
                start_date=start,
                end_date=end,
                to_csv=args.csv,
                ignore_date_validation=True,
                diff_orderbook=args.diff,
                async_requests=True,
            )
    except Exception as exc:
        fail(exc, tool="get_orderbook", symbol=args.symbol)

    days = {str(key): frame_records(df) for key, df in raw.items()}
    if not days:
        fail(
            f"no orderbook data for {args.symbol} between "
            f"{args.start} and {args.end or args.start}",
            tool="get_orderbook",
            symbol=args.symbol,
        )

    missing = [
        day
        for day in _expected_days(start, end or start)
        if day not in days
    ]
    emit(
        {
            "ok": True,
            "source": "pytse-client",
            "tool": "get_orderbook",
            "symbol": args.symbol,
            "start": args.start,
            "end": args.end,
            "diff_orderbook": args.diff,
            "day_count": len(days),
            "missing_days": missing,
            "note": (
                "missing_days lists Sat-Wed dates in the range with no "
                "records -- usually official holidays or days with zero "
                "activity"
            )
            if missing
            else None,
            "days": days,
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
