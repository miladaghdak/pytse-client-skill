# Pitfalls

## IP bans

`get_shareholders_history` hits `cdn.tsetmc.com/api/Shareholder/{index}/{date}` once per day; `get_total_shares_history_async` hits `cdn.tsetmc.com/api/Instrument/GetInstrumentHistory/{index}/{date}` the same way. Parallelising across symbols gets the IP banned. Symptom: tenacity retries on `ClientResponseError: 500` every 3–5 seconds (`wait_random(3, 5)` on this path; the export endpoints use a faster `wait_random(1, 4)`). Stop. Wait several minutes. Continue serially, or chunk with `pytse_client.utils.async_utils.run_tasks_with_wait(tasks, chunk_size, wait_between)` / `chunk_it(list, size)`.

Same caution for heavy `get_orderbook` / tick dumps over long windows. Prefer `async_requests=True` inside one symbol, not 50 symbols at once.

## asyncio

`asyncio.run()` cannot be called from a running event loop (Jupyter, FastAPI, an agent runtime that is already async). Use:

- `get_shareholders_history_async`
- `get_total_shares_history_async`

## Arabic vs Persian letters

User input often mixes `ي`/`ی` and `ك`/`ک`. Fold before lookup. The library's `replace_arabic` / `replace_persian` helpers do this on several paths, but not on every door. When a symbol "exists on TSETMC" but `Ticker` raises `ValueError`, normalise and retry, then fall back to `get_symbol_info`.

## Deactivated / delisted

`get_ticker_real_time_info_response()` raises `RuntimeError("Cannot get realtime data from inactive ticker …")` only when the symbol's current index appears in its own `old[]` index list (deactivated/delisted instrument) — not for halted ones. Catch it. Do not retry in a hot loop. Halted symbols still return a board; branch on `state` instead.

## Exceptions you will meet

| Exception | Raised by | Message shape |
|---|---|---|
| `ValueError` | `Ticker(unknown_symbol)` | `Symbol {symbol} not found, if you are trying to use a symbol which is removed from the tse website provide it's index manually:` |
| `ValueError` | `get_trade_details` bad `timeframe` | `The provided timeframe is not valid. It should be among dict_keys([...])` |
| `ValueError` | `download_fIndex_record` on garbage response | `Invalid response from the url: {url}. …` |
| `RuntimeError` | realtime calls on inactive ticker | `Cannot get realtime data from inactive ticker {symbol}` |
| `RuntimeError` | `ticker.client_types` fetch fails | `cannot download client types data try again` |
| `Exception` | `download` / `download_client_types_records` unknown symbol | `Cannot find symbol: {symbol}` |
| `Exception` | `download_financial_indexes` unknown index | `Cannot find financial index: {symbol}` |
| `Exception` | `get_orderbook` on a non-trading day (without `ignore_date_validation`) | `{date} is not a valid trade day. Make sure it is a trade day.` |
| `Exception` | `get_symbol_info` / `get_symbol_id` HTTP failure | `Sorry, tse server did not respond` |
| `Exception` | trade-details fetch after 9 retries | `Failed to fetch trade details for {ticker} on {date_obj} after 9 retries` |

## Missing fundamentals

ETFs have NAV, not EPS. Some holding names have no P/E or PSR. `p_e_ratio` is `None` when `eps` is 0/None. Return nulls.

## Delisted

```python
ticker = tse.Ticker("", index="25165947991415904")
```

`symbol` then equals the index. History may still exist via old indexes.

## Adjustment vs raw

Computing returns on raw `close` across a capital increase is wrong. Use `adjust=True`. Adjusted CSV is stored as `{symbol}-ت.csv`.

## Empty frames

`download_ticker_daily_record` can yield `EmptyDataError`. The batch downloader logs and skips — the output dict may be shorter than the input list. Re-run; do not pad.

## Dates

Export dates are Gregorian `YYYYMMDD` parsed to `datetime64`. Jalali is opt-in (`include_jdate=True`) via `jdatetime`. TSE week is Saturday–Wednesday; Thursday/Friday are closed.

## Units

Prices and values are **Rials**. Tomans = Rials / 10. Market cap = shares × adj close in Rials.

## TSETMC URL drift

Old pages live under `old.tsetmc.com`. Newer JSON APIs under `cdn.tsetmc.com/api/…`. Prefer the library — do not hardcode HTML parsers.

## Retries

HTTP 4xx/5xx on export endpoints are retried with `tenacity.wait_random(1, 4)`. Respect that; don't wrap another aggressive retry that tightens the ban.

## Constructor side effects

`Ticker(symbol)` is not cheap: it may download the full daily history. For a one-field live quote, still expect a history fetch on first use. Cache CSVs on disk (`tickers_data/`) between agent turns.
