#!/usr/bin/env python3
"""Offline runtime self-test for the pytse-client skill.

Proves the environment can serve the skill: imports, package version, and
the bundled symbol data files. Makes NO network calls, so it works as a
first gate even where tsetmc.com is unreachable.
"""
from __future__ import annotations

import importlib.metadata
from typing import Any, Callable, List

import pytse_client as tse
from pytse_client import symbols_data

from _jsonio import emit


def _checks() -> List[dict[str, Any]]:
    results: List[dict[str, Any]] = []

    def record(label: str, probe: Callable[[], Any]) -> None:
        try:
            results.append({"check": label, "ok": True, "result": probe()})
        except Exception as exc:
            results.append({"check": label, "ok": False, "error": str(exc)})

    record(
        "pytse-client version",
        lambda: importlib.metadata.version("pytse-client"),
    )
    record("import pandas", lambda: __import__("pandas").__version__)
    # jdatetime exposes no __version__ attribute; ask package metadata
    record(
        "import jdatetime",
        lambda: importlib.metadata.version("jdatetime"),
    )
    record("import bs4 (scraper stack)", lambda: __import__("bs4").__version__)
    record("import lxml", lambda: __import__("lxml").__version__)

    def symbol_count() -> int:
        count = len(symbols_data.symbols_information())
        if not count:
            raise RuntimeError("symbols_name.json loaded empty")
        return count

    record("bundled symbols_name.json", symbol_count)

    def foolad_index() -> str:
        index = symbols_data.get_ticker_index("فولاد")
        if not index:
            raise RuntimeError("فولاد did not resolve to a ticker index")
        return index

    record("resolve فولاد -> index", foolad_index)

    def index_count() -> int:
        count = len(symbols_data.financial_indexes_information())
        if not count:
            raise RuntimeError("indices_name.json loaded empty")
        return count

    record("bundled indices_name.json", index_count)

    return results


def main() -> int:
    results = _checks()
    ok = all(item["ok"] for item in results)
    emit(
        {
            "ok": ok,
            "source": "pytse-client",
            "tool": "smoke",
            "pytse-client": importlib.metadata.version("pytse-client"),
            "symbols": len(symbols_data.symbols_information()),
            "checks": results,
        }
    )
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
