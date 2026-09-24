# Data dictionary

Exact column schemas, dtypes, cache layout, and TSETMC endpoints. Every name below is verbatim from pytse-client **v0.19.1**; source references are `file:line` in the upstream repo. Read this when you need the precise shape of a DataFrame before writing pandas against it.

## Daily OHLCV — `tse.download` / `scripts/download_history.py`

Export tag → column (`translations.py:1-12`), in frame order:

| TSETMC tag | Column | Meaning |
| --- | --- | --- |
| `<DTYYYYMMDD>` | `date` | Gregorian, parsed with `format="%Y%m%d"` |
| `<FIRST>` | `open` | first trade of the day |
| `<HIGH>` | `high` | |
| `<LOW>` | `low` | |
| `<LAST>` | `close` | last trade — split-unaware when raw |
| `<VOL>` | `volume` | shares traded |
| `<CLOSE>` | `adjClose` | adjusted close |
| `<OPENINT>` | `count` | number of trades |
| `<VALUE>` | `value` | traded value, Rial |
| `<OPEN>` | `yesterday` | **previous day's close** |

Trap: TSETMC's `<OPEN>` tag holds قیمت دیروز (yesterday's close), not the day's open. The day's open is the `open` column, which comes from `<FIRST>`. Anyone computing an open-to-close return from the raw export reaches for `<OPEN>` and silently gets the previous close.

- Frame columns (10): `date, open, high, low, close, volume, adjClose, count, value, yesterday`.
- `adjust=False` → raw; `adjust=True` → capital-increase / profit-share adjustment applied in Python (`download.py:126-128`). Prefer adjusted for returns.
- `include_jdate=True` → adds `jdate` holding `jdatetime.date` objects (`download.py:49-55`).
- All numeric columns arrive as **object dtype strings** from the export; cast before arithmetic.

## Realtime board — `tse.Ticker`

`RealtimeTickerInfo` has 23 fields (`ticker/ticker.py:49-74`): `date_time, state, last_price, adj_close, yesterday_price, open_price, high_price, low_price, count, volume, value, last_date, best_demand_vol, best_demand_price, best_supply_vol, best_supply_price, sell_orders, buy_orders, individual_trade_summary, corporate_trade_summary, nav, nav_date, market_cap`.

- The full name is the property; `ticker.state` and `ticker.last_price` are conveniences that each trigger a fresh request.
- Every `Ticker` construction hits `service.tsetmc.com` (`LastPossibleDeven`) to resolve the last trade day.
- `state` is one of 8 compound values: `مجاز`, `مجاز-مسدود`, `مجاز-متوقف`, `مجاز-محفوظ`, `ممنوع`, `ممنوع-مسدود`, `ممنوع-متوقف`, `ممنوع-محفوظ`. Standalone `متوقف` never occurs.
- `RuntimeError` fires only for deactivated/delisted symbols (current index present in the `old` list) — halted symbols still return a board.
- `nav` / `nav_date` / `market_cap` are absent for some issuers (e.g. آسام) → `None`; do not synthesise them.
- `individual_trade_summary` / `corporate_trade_summary` carry the real/legal buy-sell mix from the board; `p_e_ratio` and `s_ratio` are derived client-side from EPS and market cap, not fetched.

## Client types — `tse.Ticker.client_types` / `scripts/client_types.py`

18 columns (`download.py:399-435`): 13 base, 4 mean prices, 1 ownership change.

| # | Column | Derivation |
| --- | --- | --- |
| 1 | `date` | |
| 2 | `individual_buy_count` | |
| 3 | `corporate_buy_count` | |
| 4 | `individual_sell_count` | |
| 5 | `corporate_sell_count` | |
| 6 | `individual_buy_vol` | |
| 7 | `corporate_buy_vol` | |
| 8 | `individual_sell_vol` | |
| 9 | `corporate_sell_vol` | |
| 10 | `individual_buy_value` | |
| 11 | `corporate_buy_value` | |
| 12 | `individual_sell_value` | |
| 13 | `corporate_sell_value` | |
| 14 | `individual_buy_mean_price` | `value / vol` |
| 15 | `individual_sell_mean_price` | `value / vol` |
| 16 | `corporate_buy_mean_price` | `value / vol` |
| 17 | `corporate_sell_mean_price` | `value / vol` |
| 18 | `individual_ownership_change` | `corporate_sell_vol - corporate_buy_vol` |

Gotchas:

- `mean_price` is `value / vol`, so a zero-volume day with a non-zero value yields `inf`, and a day with both zero yields `NaN`. Guard before averaging these columns.
- `individual_ownership_change` is **corporate net flow** (corporate selling pressure minus corporate buying). A positive value means corporate net sellers — the sign reads as "individuals gained float", not "individuals bought".
- Bulk download runs 10 workers and raises `Exception(f"Cannot find symbol: {symbol}")` for an unresolvable symbol.
- When the per-symbol record comes back `None`, the property raises `RuntimeError("cannot download client types data try again")`.

## Financial indexes — `tse.FinancialIndex` / `scripts/financial_index.py`

7 columns in this order (`download.py:42-46`): `date, high, low, open, close, volume`. The raw `IndexFinancial.aspx?t=ph` payload carries a trailing unnamed field; upstream binds it to `__` and drops it. Do not expect `yesterday`, `count`, or `value` here — those exist only in the per-ticker export.

- Values are **object dtype** strings straight off the wire; cast with `pd.to_numeric(errors="coerce")`.
- `date` is Gregorian `%Y%m%d`; `jdate` appears when `include_jdate=True`.
- Index **names** are stored Arabic-normalized (`شاخص كل` with Arabic `ك`). `download_financial_indexes` runs `replace_persian` on your input; `FinancialIndex(symbol=...)` does **not**. Passing the Persian-spelled form resolves nothing and then raises `Exception("Cannot find financial index: {symbol}")`.
- An empty response is skipped as `pd.errors.EmptyDataError` and logged, not raised; if any index fails, `download_financial_indexes` prints `Warning, download did not complete, re-run the code` and returns the partial dict.
- 10 workers; CSV `{base_path}/{symbol}.csv`.
- An index ticker has no shares, no flow, and no order book. Only the price series applies.

## Orderbook — `scripts/get_orderbook.py` / `ticker.get_orderbook`

Two shapes from one endpoint. Raw mode keeps the tick stream; `--diff` pivots it into a wide five-level snapshot.

**Raw mode** — `DatetimeIndex` named `datetime` plus 7 columns (`orderbook/common.py:95-113`): `depth, bid, ask, vol_bid, vol_ask, num_bid, num_ask`. `datetime` is `date + " " + hEven` parsed with `format="%Y%m%d %H%M%S"`; rows are sorted by `(datetime, depth)`. `refID` is parsed then dropped.

**Diff mode** — 30 interleaved columns, 6 per level for `MAX_DEPTH = 5`:

```
bid_1, ask_1, vol_bid_1, vol_ask_1, num_bid_1, num_ask_1,
bid_2, ask_2, vol_bid_2, vol_ask_2, num_bid_2, num_ask_2,
...
bid_5, ask_5, vol_bid_5, vol_ask_5, num_bid_5, num_ask_5
```

- Diff mode pivots on `depth`, so a level only carries data on the tick where it changed; the gaps are back-filled with `fillna(method="ffill")` — deprecated on pandas ≥ 2.1, prefer `.ffill()`. A level that never prints stays `NaN` for the whole day.
- `depth` disappears in diff mode (it becomes the column-name suffix). Recover it by parsing the trailing `_N`.
- API field mapping (`api_to_orderbook_mapping`, `orderbook/common.py:19-28`): `hEven→datetime`, `refID→refID`, `number→depth`, `pMeDem→bid`, `pMeOf→ask`, `qTitMeDem→vol_bid`, `qTitMeOf→vol_ask`, `zOrdMeDem→num_bid`, `zOrdMeOf→num_ask`.
- A non-trade date raises exactly `"{date} is not a valid trade day. Make sure it is a trade day."` (`orderbook/common.py:8`).
- CSV: `organized_orderbook_{YYYY-MM-DD}.csv` in `orderbook_hist_data`.

## Trade details — `scripts/get_trade_details.py`

Returns `Dict[str, DataFrame]`, not a single frame: one entry per instrument day, keyed by symbol.

- Raw columns: `price` (`pTran`), `volume` (`qTitTran`), `datetime` (`hEven`).
- Timeframe argument → TSETMC bar code: `30s→30S`, `1m→1T`, `5m→5T`, `10m→10T`, `15m→15T`, `30m→30T`, `1h→1H`. Omit it for raw ticks. An unrecognised value raises `ValueError`.
- `aggregate=True` collapses the dict to one key: `{"aggregate": pd.concat(result.values())}`, sorted by `datetime`.
- An empty date range raises `ValueError`.
- CSV: `trade_details_{YYYY-MM-DD}.csv` in `trade_details_history`, written under `base_path` when given, else the module default.

## Market-wide asks/bids — `tse.get_asks_and_bids`

9 columns, market-wide rather than per symbol: `id, row_number, num_of_sellers, number_of_buyers, buy_price, sell_price, buy_volume, sell_volume` plus an added `symbol` (`asks_bids.py:14-38`).

- Parsed from the market-watch payload: `text.split("@")[3].split(";")`, then comma-split per row — the leading field is the instrument `id`.
- Rows are filtered to ids present in `map_index_to_symbols()`, then `symbol` is attached. Ids outside the bundled symbol map are dropped silently.
- All eight parsed fields are **strings**; the attached `symbol` is a string too. Cast with `pd.to_numeric`.
- This is the live top-of-book across the whole market, one row per instrument. For a single symbol's five levels use `get_orderbook`.
- CSV: `bids_asks.csv` in `asks_bids_data`.

## Filter-writing stats — `scripts/get_stats.py` / `Ticker.statistics`

~121 columns per symbol: 89 فیلترنویسی key stats, 9 raw client-type fields, 23 market-watch fields.

**89 key stats** (`ticker_statisticals/key_stats.py:18-130`, ids 1–89). Families: traded value, volume, and number of transactions — average and rank over 3- and 12-month windows (ids 1–12); weighted average price, normal and base-volume (13–14); last-day value, volume, transactions (15–17); negative, non-trading, positive, total-trading, open, and close day counts with percentages and ranks across both windows (18–49); individual and corporate buy/sell volume and buyer/seller counts with averages and ranks (50–89). Names follow `ave_*`, `rank_*`, `numof_*`, `percent_*`, `val_*`, `w_ave_price_*`, `vol_*`.

**9 client-type fields** (`ticker_statisticals/utils.py:104-128`): `index, numof_individual_buy, numof_corporate_buy, vol_individual_buy, vol_corporate_buy, numof_individual_sell, numof_corporate_sell, vol_individual_sell, vol_corporate_sell`.

**23 market-watch fields** (`ticker_statisticals/utils.py:50-74`): `index, code, symbol, name, last_changed, open_price, adj_closing_price, last_price, number_of_trans, volume_of_trans, value_of_trans, min_price, max_price, yesterday_price, EPS, base_volume, visit_count, flow, group_number, max_price_allowed, min_price_allowed, number_of_stocks, yval`.

- Every one of these arrives as a **string**; the frame has no numeric columns until you cast them.
- `flow` is a market code: only **0–5** are used, and `3` means آتی (futures) — not مشتقه. Unrecognised codes come through as `""`. Do not map the numbers to venue names from memory; resolve them per instrument.
- `EPS` is `""` for issuers without earnings (e.g. آسام) — return `null`, never `0`.
- CSV: `key_stats.csv` in `stats_data`.

## Shareholders

**Snapshot** — `Ticker.shareholders` (`ticker/ticker.py:398-409`), an HTML-table scrape of `old.tsetmc.com/Loader.aspx?Partree=15131T&c={ci_sin}`: 5 columns `id, shareholder, shares, percentage, change`. The scraper prepends `id` and renames the Persian headers through `SHAREHOLDERS_FIELD_MAPPINGS` (`translations.py:14-19`): `سهامدار/دارنده→shareholder`, `سهم→shares`, `درصد→percentage`, `تغییر→change`. Numeric cells are converted where they parse, so columns are mixed-type.

**History** — `Ticker.get_shareholders_history` (`ticker/ticker.py:411-488`), 7 columns: `date, shareholder_id, shareholder_shares, shareholder_percentage, shareholder_instrument_id, shareholder_name, change`. Defaults `from_when=timedelta(days=90)`, `only_trade_days=True`; one `cdn.tsetmc.com/api/Shareholder/{index}/{date}` call per trade day over `aiohttp.TCPConnector(limit=25)`. The sync wrapper is `asyncio.run` — use the `_async` variant inside a running loop.

**Total shares** — `Ticker.get_total_shares_history_async` (`ticker/ticker.py:490-537`), 2 columns `date, total_shares`. Defaults `from_when=timedelta(days=60)`, `only_open_days=True`, via `cdn.tsetmc.com/api/Instrument/GetInstrumentHistory/{index}/{date}`.

## CSV cache layout

Default directories from `config.py:1-10`. Every downloader takes a `base_path` override and creates the directory on demand.

| Directory | File | Written by |
| --- | --- | --- |
| `financial_index_data` | `{symbol}.csv` | `download_financial_indexes` |
| `tickers_data` | `{symbol}.csv` (raw), `{symbol}-ت.csv` (adjusted) | `download`, `Ticker` constructor |
| `stats_data` | `key_stats.csv` | statistics download |
| `client_types_data` | `{symbol}.csv` | client-types download |
| `shareholders_data` | default path for shareholders history | no automatic write — persist it yourself |
| `asks_bids_data` | `bids_asks.csv` | `get_asks_and_bids` |
| `orderbook_hist_data` | `organized_orderbook_{YYYY-MM-DD}.csv` | orderbook download |
| `trade_details_history` | `trade_details_{YYYY-MM-DD}.csv` | trade-details download |

- The `ت` suffix (تعدیل‌شده) marks the adjusted cache, so raw and adjusted frames coexist.
- A `Ticker` built from `index=` caches as `tickers_data/{index}.csv` — the constructor sets `self.symbol = symbol if index is None else self._index`, so the filename follows the index (`ticker/ticker.py:80-145`).
- The constructor re-downloads when the cache's last date differs from the last trade day, and only then writes to CSV.
- Base-path constants: `FINANCIAL_INDEX_BASE_PATH`, `DATA_BASE_PATH`, `STATS_BASE_PATH`, `CLIENT_TYPES_DATA_BASE_PATH`, `SHAREHOLDERS_HISTORY_PATH`, `ASKS_BIDS_PATH`, `ORDER_BOOK_HIST_PATH`, `TRADE_DETAILS_HIST_PATH`. Logger name: `pytse`.

## TSETMC endpoints

22 constants in `tse_settings.py:1-77`. Three hosts, all plain HTTP.

| Constant | Host | Path |
| --- | --- | --- |
| `TSE_GET_LAST_TRADE_DAY` | `service` | `/tsev2/data/TseClient2.aspx?t=LastPossibleDeven` |
| `TSE_TICKER_EXPORT_DATA_ADDRESS` | `old` | `/tsev2/data/Export-txt.aspx?t=i&a=1&b=0&i={}` |
| `TSE_FINANCIAL_INDEX_EXPORT_DATA_ADDRESS` | `old` | `/tsev2/chart/data/IndexFinancial.aspx?i={}&t=ph` |
| `FINANCIAL_INDEX_EXPORT_INTRADAY_URL` | `old` | `/Loader.aspx?ParTree=15131J&i={}` |
| `TSE_TICKER_ADDRESS` | `old` | `/Loader.aspx?ParTree=151311&i={}` |
| `TSE_INSTRUMENT_INFO` | `cdn` | `/api/Instrument/GetInstrumentInfo/{}` |
| `TSE_ISNT_INFO_URL` | `old` | `/tsev2/data/instinfofast.aspx?i={}&c=0&e=1` |
| `TSE_TICKER_INTRODUCTION_URL` | `old` | `/Loader.aspx?Partree=15131V&s={}` |
| `TSE_CLIENT_TYPE_DATA_URL` | `old` | `/tsev2/data/clienttype.aspx?i={}` |
| `TSE_SYMBOL_ID_URL` | `old` | `/tsev2/data/search.aspx?skey={}` |
| `TSE_TRADE_DETAIL_URL` | `old` | `/tsev2/data/TradeDetail.aspx?i={}` |
| `TSE_SHAREHOLDERS_URL` | `old` | `/Loader.aspx?Partree=15131T&c={}` |
| `INSTRUMENT_DAY_INFO_URL` | `cdn` | `/Loader.aspx?ParTree=15131P&i={index}&d={date}` — **dead code, no callers** |
| `SYMBOLS_LIST_URL` | `old` | `/Loader.aspx?ParTree=111C1417` |
| `MARKET_WATCH_INIT_URL` | `old` | `/tsev2/data/MarketWatchInit.aspx?h=0&r=0` |
| `SYMBOL_DAY_INFO_SHAREHOLDERS_DATA` | `cdn` | `/api/Shareholder/{index}/{date}` |
| `SYMBOL_DAY_INSTRUMENT_INFO_URL` | `cdn` | `/api/Instrument/GetInstrumentHistory/{index}/{date}` |
| `KEY_STATS_URL` | `old` | `/tsev2/data/InstValue.aspx?t=a` |
| `MARKET_WATCH_URL` | `old` | `/tsev2/data/MarketWatchInit.aspx?h=0&r=0` |
| `TICKER_ORDER_BOOK` | `cdn` | `/api/BestLimits/{index}/{date}` |
| `TICKER_TRADE_DETAILS` | `cdn` | `/api/Trade/GetTradeHistory/{index}/{date}/true` |
| `CLIENT_TYPES_URL` | `old` | `/tsev2/data/ClientTypeAll.aspx` |

- `service.tsetmc.com` serves exactly one endpoint (`LastPossibleDeven`), and every `Ticker` construction depends on it.
- `MARKET_WATCH_INIT_URL` and `MARKET_WATCH_URL` are the same URL under two names.
- Dates in path segments use `DATE_FORMAT = "%Y%m%d"`; `MIN_DATE = 20010321` is the first day with data.

## Serialization gotchas

- **Everything is a string first.** Export endpoints hand back object-dtype columns. Run `pd.to_numeric(df[col], errors="coerce")` before any arithmetic; silent string concatenation is the default failure.
- **Jalali dates do not JSON-serialise.** A `jdate` column of `jdatetime.date` objects makes `json.dumps` raise `OverflowError` on jdatetime ≥ 3.8.2, and `astype(str)` yields `""` on pandas 3.x. Convert per cell: `df.jdate.map(lambda d: str(d) if d is not None else None)`. `scripts/_jsonio.py` does this.
- **`orient="records"` drops the index.** Datetime-indexed frames (raw orderbook) lose their time axis; call `rename_axis("datetime").reset_index()` and emit ISO-8601 instead.
- **A Python `date` is not a JSON value.** Serialise dates as ISO strings.
- **`mean_price` is not `NaN`-safe** — it is `inf` on a zero-volume day (see client types).
- **Orderbook diff back-fill yields `NaN` columns** for levels that never printed.
- Prices are **Rial**. Divide by 10 for Toman and say which one you used.
