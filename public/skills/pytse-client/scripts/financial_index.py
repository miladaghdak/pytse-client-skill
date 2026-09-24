#!/usr/bin/env python3
"""Snapshot + daily history for a TSE financial index (e.g. شاخص كل).

The default is the overall TEDPIX index. Persian keyboard input is accepted:
the name is normalized with replace_persian so it matches the Arabic-
normalized keys of indices_name.json (FinancialIndex does NOT normalize
before lookup -- raw Persian ک resolves index=None and breaks every
intraday member).
"""
from __future__ import annotations

import argparse

import pytse_client as tse
from pytse_client.utils.persian import replace_persian

from _jsonio import emit, fail, frame_records, quiet


def _comma_float(text: object) -> float | None:
    """high/low arrive as raw strings with thousands commas, e.g. '2,451,900'."""
    try:
        return float(str(text).replace(",", ""))
    except (TypeError, ValueError):
        return None


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Financial index snapshot + daily history"
    )
    parser.add_argument(
        "symbol",
        nargs="?",
        default="شاخص كل",
        help="index name; normalized to the Arabic-spelled keys of "
        "indices_name.json (default: شاخص كل = TEDPIX)",
    )
    args = parser.parse_args()
    symbol = replace_persian(args.symbol.strip())

    try:
        with quiet():
            idx = tse.FinancialIndex(symbol=symbol)
            history = idx.history  # always includes the jdate column
            last_value = idx.last_value
            last_update = idx.last_update
            high = idx.high
            low = idx.low
    except Exception as exc:
        fail(exc, tool="financial_index", symbol=symbol)

    emit(
        {
            "ok": True,
            "source": "pytse-client",
            "tool": "financial_index",
            "symbol": symbol,
            "last_value": last_value,
            "last_update": last_update,
            "high": high,
            "low": low,
            "high_value": _comma_float(high),
            "low_value": _comma_float(low),
            "history": frame_records(history),
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
