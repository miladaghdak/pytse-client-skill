#!/usr/bin/env python3
"""Shared JSON I/O helpers for the bundled scripts (private, not a tool).

Every user-facing script prints exactly one JSON object on stdout and keeps
upstream library print()/log chatter on stderr, so agents can pipe output
safely.  Import as ``from _jsonio import ...`` -- run scripts directly
(``python scripts/<name>.py``) so this module is importable from sys.path[0].
"""
from __future__ import annotations

import contextlib
import datetime as dt
import json
import sys
from typing import Any, Dict, Iterator, List

import pandas as pd

SOURCE = "pytse-client"


def emit(payload: Dict[str, Any]) -> None:
    """Write one JSON object to stdout (UTF-8) followed by a newline."""
    reconfigure = getattr(sys.stdout, "reconfigure", None)
    if callable(reconfigure):
        reconfigure(encoding="utf-8")
    json.dump(payload, sys.stdout, ensure_ascii=False, default=_json_safe)
    sys.stdout.write("\n")


def fail(message: Any, **extra: Any) -> None:
    """Emit the standard error envelope and exit nonzero. Never returns."""
    emit({"ok": False, "error": str(message), "source": SOURCE, **extra})
    raise SystemExit(1)


@contextlib.contextmanager
def quiet() -> Iterator[None]:
    """Divert upstream library print()s to stderr (stdout stays pure JSON)."""
    with contextlib.redirect_stdout(sys.stderr):
        yield


def frame_records(frame: pd.DataFrame) -> List[Dict[str, Any]]:
    """Serialize a pytse-client DataFrame to JSON-safe records.

    Invariants (empirically verified against pandas 3.0 / jdatetime 3.8):
    - a datetime64 ``date`` column becomes ``YYYY-MM-DD`` strings;
    - a ``jdate`` column holds jdatetime.date objects that json cannot
      serialize (jdatetime >= 3.8 raises OverflowError) and that
      ``.astype(str)`` silently turns into "" on pandas 3 -- so each cell
      is str()'d individually instead;
    - a DatetimeIndex becomes an explicit ISO ``datetime`` column
      (``orient="records"`` would otherwise drop the time axis entirely);
    - NaN/None cells serialize as null.
    """
    data = frame.copy()
    if "date" in data.columns and pd.api.types.is_datetime64_any_dtype(
        data["date"]
    ):
        data["date"] = data["date"].dt.strftime("%Y-%m-%d")
    if "jdate" in data.columns:
        data["jdate"] = data["jdate"].map(_str_or_none)
    if isinstance(data.index, pd.DatetimeIndex):
        axis_name = data.index.name or "datetime"
        data = data.rename_axis(axis_name).reset_index()
        data[axis_name] = data[axis_name].map(_iso_or_none)
    return json.loads(data.to_json(orient="records", force_ascii=False))


def _missing(value: Any) -> bool:
    return value is None or value is pd.NaT or (
        isinstance(value, float) and value != value
    )


def _str_or_none(value: Any) -> Any:
    return None if _missing(value) else str(value)


def _iso_or_none(value: Any) -> Any:
    if _missing(value):
        return None
    if isinstance(value, (dt.datetime, dt.date)):
        return value.isoformat()
    return str(value)


def _json_safe(value: Any) -> Any:
    """json.dump default hook: dates ISO-formatted, numpy scalars unboxed,
    anything else degraded to str() rather than crashing the payload."""
    if isinstance(value, (dt.datetime, dt.date)):
        return value.isoformat()
    item = getattr(value, "item", None)
    if callable(item):
        try:
            return item()
        except Exception:
            pass
    return str(value)
