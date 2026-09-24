---
name: pytse-client
description: Work with Tehran Stock Exchange (TSE / TSETMC / بورس تهران) data via pytse-client. Use when the user asks for Iranian stocks, Persian ticker symbols (فولاد, وبملت, شپنا, خودرو, خساپا), historical OHLCV, adjusted prices, realtime quotes, order book / five best bids-asks, tick/trade details, individual vs institutional (حقیقی حقوقی) flow, major shareholders, financial indexes (شاخص کل), filter-writing stats (فیلترنویسی), EPS/P/E/NAV/float shares, or exporting TSE CSVs. Do not use for NYSE, crypto, or non-Iranian markets.
license: GPL-3.0
compatibility: Requires Python 3.8+, the pytse-client package, and outbound HTTP to service.tsetmc.com / old.tsetmc.com / cdn.tsetmc.com. Persian (fa-IR) identifiers are first-class. Not for NYSE, crypto, or non-Iranian venues.
metadata:
  author: Milad Aghdak
  author_url: https://github.com/MiladAghdak
  source_repo: https://github.com/Glyphack/pytse-client
  source_version: "0.19.1"
  skill_version: "1.0.0"
  language: python
allowed-tools: Bash Read Write
---

# pytse-client

An Agent Skill for Tehran Stock Exchange (بورس اوراق بهادار تهران) data, wrapping [Glyphack/pytse-client](https://github.com/Glyphack/pytse-client) v0.19.1.

## When to activate

Activate for TSE / TSETMC / بورس تهران, Iranian listed companies, Persian ticker symbols, شاخص کل, حقیقی/حقوقی, سهامداران عمده, فیلترنویسی, order books, ticks, or tsetmc.com. Never activate for NYSE, Nasdaq, crypto, FX, or other venues.

## Runtime

```bash
pip install pytse-client
# bleeding edge
pip install git+https://github.com/Glyphack/pytse-client.git
```

Always `import pytse_client as tse`. Python 3.8+ (pyproject declares ^3.7.2, but the code uses `functools.cached_property`). Outbound HTTP to `service.tsetmc.com`, `old.tsetmc.com`, `cdn.tsetmc.com` is required.

## Decision tree

1. Universe / resolve a name → `tse.all_symbols()` or `scripts/resolve_symbol.py` — see `references/symbols-and-markets.md`
2. Daily OHLCV → `scripts/download_history.py` / `tse.download` — `references/download-api.md`
3. One symbol live board + fundamentals → `scripts/ticker_snapshot.py` / `tse.Ticker` — `references/ticker-api.md`
4. Historical five-level book → `scripts/get_orderbook.py` — `references/orderbook-and-trades.md`
5. Ticks or intraday bars → `scripts/get_trade_details.py`
6. Retail vs institutional → `scripts/client_types.py` / `ticker.client_types`
7. Index (شاخص) → `scripts/financial_index.py` / `tse.FinancialIndex` — `references/financial-indexes.md`
8. Filter-writing universe → `scripts/get_stats.py` — `references/filter-stats.md`

On any error, encoding issue, IP ban, or asyncio complaint: read `references/pitfalls.md` before retrying.

Exact column schemas, dtypes, CSV cache layout, and TSETMC endpoint tables: `references/data-dictionary.md`. Offline runtime self-test: `scripts/smoke.py`.

## Hard rules

1. Two normalization directions. Ticker symbols are stored Persian-normalized (`ي→ی`, `ك→ک` — `replace_arabic`); financial-index names are stored Arabic-normalized (`شاخص كل` with Arabic `ك` — `replace_persian`). `download_financial_indexes` normalizes input for you; `FinancialIndex(symbol=...)` does not.
2. Never fan-out `get_shareholders_history` across many symbols. TSETMC will ban the IP. Serialise and back off on HTTP 500.
3. If already inside an event loop, call `*_async` variants. Never nest `asyncio.run()`.
4. Deactivated/delisted symbols (current index listed in `old`) raise `RuntimeError` from realtime calls — catch it. Halted symbols (`ممنوع`, `مجاز-متوقف`, …) still return a board; read `state`.
5. Delisted symbols require the numeric `index=` argument to `Ticker`.
6. Prefer `adjust=True` when computing returns; raw close is split-unaware.
7. Bundled scripts print UTF-8 JSON (`ensure_ascii=False`) on stdout; failures emit `{"ok": false, "error": …}` and exit nonzero.
8. TSETMC export dates are Gregorian. Pass `include_jdate=True` when the user thinks in Jalali.
9. Do not scrape extra TSETMC pages ad-hoc — use the library.
10. Prices are Iranian Rials. If the user asks for Tomans, divide by 10 and say so.
11. Constructor `Ticker(symbol)` downloads history if the CSV cache is missing or stale vs last trade day.
12. Some names (e.g. آسام) have no EPS / P/E / PSR. Return `null`, do not invent.

## Scripts

Run from the skill root. Prefer scripts over ad-hoc Python when the host allows execution.

- `scripts/smoke.py` — offline self-test, no network
- `scripts/resolve_symbol.py QUERY` — name or symbol → instrument id
- `scripts/download_history.py [SYMBOL] [--all] [--adjust] [--jdate] [--csv]`
- `scripts/ticker_snapshot.py SYMBOL [--adjust] [--index NUMERIC_INDEX]`
- `scripts/client_types.py SYMBOL [--jdate] [--csv]`
- `scripts/financial_index.py [SYMBOL]` — defaults to `شاخص كل`
- `scripts/get_orderbook.py SYMBOL START [END] [--diff] [--csv]`
- `scripts/get_trade_details.py SYMBOL START [END] [--timeframe {30s,1m,5m,10m,15m,30m,1h}] [--csv]`
- `scripts/get_stats.py [--csv]`

`--index` takes the numeric instrument id, required for delisted symbols that have no ticker. Dates are `YYYY-MM-DD`. Every script prints one UTF-8 JSON object on stdout and exits nonzero on failure; `scripts/_jsonio.py` is the shared helper they import, not an entry point.

## Output contract

Every JSON payload includes `ok`, `symbol` (when applicable), `source: "pytse-client"`, and ISO-8601 dates. DataFrames become arrays of objects (datetime axes surface as ISO-8601 `datetime` fields). Do not dump pandas repr to the user — summarise, then offer CSV.

## Hosted API

This skill is also served over HTTP by the Skill Studio (every response carries `demo: true` — synthetic data, never live TSETMC quotes):

- `GET /api/skill` — catalog (name + description for progressive disclosure)
- `GET /api/tools` — tool list with JSON Schema
- `POST /api/tools/invoke` — `{ "tool": "ticker_snapshot", "input": { "symbol": "فولاد" } }`
- `GET /api/skill/files` — bundled files

See `references/agent-protocol.md` before calling the host.

## Community

- Source: https://github.com/Glyphack/pytse-client
- Discord: https://discord.gg/ampPDKHpVv
- Upstream license: GPLv3
