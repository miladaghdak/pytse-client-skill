#!/usr/bin/env python3
"""Emit a JSON snapshot of a TSE ticker (fundamentals + last board).

Fundamentals are scraped once inside the Ticker constructor; the realtime
board is fetched with a SINGLE get_ticker_real_time_info_response() call
-- every board property on Ticker re-fetches the same endpoint, so reading
them one by one costs ~20 HTTP round-trips. Deactivated/delisted symbols
have no live board: the single fetch raises RuntimeError and board fields
serialize as null.
"""
from __future__ import annotations

import argparse
import datetime as dt
from typing import Any, Callable, Optional

import pytse_client as tse

from _jsonio import emit, fail, quiet

BOARD_FIELDS = (
    "state",
    "last_price",
    "adj_close",
    "yesterday_price",
    "open_price",
    "high_price",
    "low_price",
    "count",
    "volume",
    "value",
    "best_demand_vol",
    "best_demand_price",
    "best_supply_vol",
    "best_supply_price",
    "nav",
    "nav_date",
    "market_cap",
)


def _maybe(getter: Callable[[], Any]) -> Any:
    """Static scraped fields can still be missing on odd symbols."""
    try:
        return getter()
    except Exception:
        return None


def _ratio(numerator: Any, denominator: Any) -> Optional[float]:
    """Mirror upstream p_e_ratio/p_s_ratio semantics: None when unset."""
    try:
        return numerator / denominator if denominator else None
    except (TypeError, ZeroDivisionError):
        return None


def _iso(value: Any) -> Optional[str]:
    if value is None or (
        isinstance(value, float) and value != value
    ):  # None or NaN
        return None
    return value.isoformat() if isinstance(value, (dt.datetime, dt.date)) else str(value)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Ticker fundamentals + one realtime board snapshot"
    )
    parser.add_argument("symbol", help="Persian ticker")
    parser.add_argument(
        "--adjust", action="store_true", help="use the adjusted price series"
    )
    parser.add_argument(
        "--index",
        default=None,
        help="numeric TSETMC index for delisted/inactive names",
    )
    args = parser.parse_args()

    try:
        with quiet():
            ticker = tse.Ticker(
                args.symbol, index=args.index, adjust=args.adjust
            )
    except Exception as exc:
        fail(
            exc,
            tool="ticker_snapshot",
            symbol=args.symbol,
            hint='for delisted names pass --index, e.g. --index="25165947991415904"',
        )

    # fundamentals: scraped once by the constructor, no further HTTP
    eps = _maybe(lambda: ticker.eps)
    psr = _maybe(lambda: ticker.psr)

    try:
        with quiet():
            realtime = ticker.get_ticker_real_time_info_response()
    except Exception:
        # RuntimeError = deactivated/delisted (no live board); network
        # hiccups land here too -- fundamentals below are still served.
        realtime = None

    payload: dict[str, Any] = {
        "ok": True,
        "source": "pytse-client",
        "tool": "ticker_snapshot",
        "symbol": ticker.symbol,
        "index": ticker.index,
        "url": _maybe(lambda: ticker.url),
        "title": _maybe(lambda: ticker.title),
        "group_name": _maybe(lambda: ticker.group_name),
        "fiscal_year": _maybe(lambda: ticker.fiscal_year),
        "flow": _maybe(lambda: ticker.flow),
        "eps": eps,
        "psr": psr,
        "base_volume": _maybe(lambda: ticker.base_volume),
        "float_shares": _maybe(lambda: ticker.float_shares),
        "total_shares": _maybe(lambda: ticker.total_shares),
        "realtime_available": realtime is not None,
    }
    if realtime is not None:
        payload.update(
            {field: getattr(realtime, field, None) for field in BOARD_FIELDS}
        )
        # derived ratios reuse the fetched board instead of re-fetching
        payload["p_e_ratio"] = _ratio(realtime.adj_close, eps)
        payload["p_s_ratio"] = _ratio(realtime.adj_close, psr)
        payload["group_p_e_ratio"] = _maybe(lambda: ticker.group_p_e_ratio)
        payload["last_date"] = _iso(realtime.last_date)
    else:
        payload.update({field: None for field in BOARD_FIELDS})
        payload["p_e_ratio"] = None
        payload["p_s_ratio"] = None
        payload["group_p_e_ratio"] = None
        payload["last_date"] = None

    emit(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
