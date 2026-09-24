#!/usr/bin/env python3
"""Resolve a Persian ticker to its TSETMC index / old indexes."""
from __future__ import annotations

import argparse

import pytse_client as tse
from pytse_client.download import get_symbol_info
from pytse_client.utils.persian import replace_arabic

from _jsonio import emit, fail, quiet


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Resolve a Persian ticker to TSETMC ids"
    )
    parser.add_argument("query", help="symbol text to resolve")
    args = parser.parse_args()
    q = replace_arabic(args.query.strip())

    try:
        with quiet():
            info = get_symbol_info(q)
    except Exception as exc:
        fail(exc, tool="resolve_symbol", query=q)

    if info is None:
        emit(
            {
                "ok": False,
                "source": "pytse-client",
                "tool": "resolve_symbol",
                "error": f"Cannot find symbol: {q}",
                "hint": "Pass index= to Ticker() for delisted names.",
                "query": q,
            }
        )
        return 2

    # upstream's get_symbol_info never fills MarketSymbol.code; the bundled
    # symbols_name.json carries it, so enrich the payload from there.
    record = tse.symbols_data.symbols_information().get(info.symbol, {})
    emit(
        {
            "ok": True,
            "source": "pytse-client",
            "tool": "resolve_symbol",
            "query": q,
            "symbol": info.symbol,
            "name": info.name,
            "index": info.index,
            "old": info.old,
            "code": record.get("code"),
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
