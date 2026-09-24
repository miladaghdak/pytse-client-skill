# Ticker API

```python
import pytse_client as tse
ticker = tse.Ticker("نوری")                 # downloads history if cache stale
ticker = tse.Ticker("نوری", adjust=True)    # split/dividend adjusted history
ticker = tse.Ticker("", index="25165947991415904")  # delisted / removed symbol
```

Constructor resolves `symbols_data.get_ticker_index(symbol)`. If missing, raises `ValueError` telling you to pass `index=`. It then loads CSV cache from `tickers_data/{symbol}.csv` (or `{symbol}-ت.csv` when adjusted) and refreshes when the last cached date ≠ `Ticker.get_last_trade_day()`. Note: the refresh path writes the CSV; the very first fetch (no cache yet) does not — call `tse.download(symbol, write_to_csv=True)` once if you want a persistent cache.

## Identity

| Property | Meaning |
|---|---|
| `symbol` | Persian ticker |
| `index` | TSETMC numeric instrument index |
| `instrument_id` | ISIN-like id parsed from the old ticker page |
| `ci_sin` | CIsin from the same page |
| `title` | Company name (Persian, Arabic letters folded) |
| `fulltitle` | Name plus market suffix |
| `url` | `http://old.tsetmc.com/Loader.aspx?ParTree=151311&i={index}` |
| `group_name` | Industry group, e.g. محصولات شيميايي |
| `flow` | Market title: بورس / فرابورس / … |
| `fiscal_year` | e.g. `12/29` |

## Fundamentals

| Property | Notes |
|---|---|
| `eps` | Estimated EPS. `None` when TSETMC has `EstimatedEPS=''` |
| `p_e_ratio` | `adj_close / eps`. `None` if eps missing/0 |
| `group_p_e_ratio` | Sector P/E. Some banks have none |
| `psr` | Producer-only. Funds often `None` |
| `p_s_ratio` | `adj_close / psr` |
| `nav`, `nav_date` | Funds / ETFs |
| `base_volume` | حجم مبنا |
| `float_shares` | درصد سهام شناور reported by TSETMC |
| `total_shares` | Share count |
| `market_cap` | `total_shares * adj_close` (on realtime info too) |

## Last session board

`state`, `last_price`, `adj_close`, `yesterday_price`, `open_price`, `high_price`, `low_price`, `count`, `volume`, `value`, `last_date`, `sta_max`, `sta_min`, `min_week`, `max_week`, `min_year`, `max_year`, `month_average_volume`, `best_supply_price`, `best_supply_vol`, `best_demand_price`, `best_demand_vol`.

`state` is one of 8 compound codes: `مجاز`, `مجاز-مسدود`, `مجاز-متوقف`, `مجاز-محفوظ`, `ممنوع`, `ممنوع-مسدود`, `ممنوع-متوقف`, `ممنوع-محفوظ` — standalone `متوقف` never occurs (halt is always a compound). Halted symbols still return a live board; read `state` to know which.

## History & client types

- `ticker.history` — DataFrame columns: `date, open, high, low, close, adjClose, yesterday, volume, count, value` (+ `jdate` if downloaded with the flag via `download()`).
- `ticker.trade_dates` — `List[datetime.date]` of session dates covered by the cached history.
- `ticker.from_file()` — re-read the CSV cache from disk (what the constructor uses when the cache is fresh).
- `ticker.client_types` — retail/institutional history (same columns as `download_client_types_records`).

## Realtime

```python
try:
    rt = ticker.get_ticker_real_time_info_response()
except RuntimeError:
    # deactivated/delisted instrument (current index listed in its old[]
    # indexes) — no live book. Halted symbols do NOT land here; they still
    # return a board — check board.state instead.
    rt = None
```

`RealtimeTickerInfo` fields: `date_time, state, last_price, adj_close, yesterday_price, open_price, high_price, low_price, count, volume, value, last_date, best_demand_vol, best_demand_price, best_supply_vol, best_supply_price, sell_orders, buy_orders, individual_trade_summary, corporate_trade_summary, nav, nav_date, market_cap`.

Each order: `.volume`, `.count`, `.price`. Trade summary: `.buy_count`, `.buy_vol`, `.sell_count`, `.sell_vol`.

CSV helper: `ticker_real_time_data_to_csv(ticker)`.

## Shareholders & float

```python
ticker.shareholders  # DataFrame: id, shareholder, shares, percentage, change
float_est = 100 - ticker.shareholders.percentage.sum()
```

History (slow, ban-sensitive):

```python
ticker.get_shareholders_history(
    from_when=datetime.timedelta(days=90),
    to_when=datetime.datetime.now(),
    only_trade_days=True,
)
# inside a running loop:
await ticker.get_shareholders_history_async(...)
```

Share-count history is async-only:

```python
result = asyncio.run(ticker.get_total_shares_history_async(
    from_when=datetime.timedelta(days=60),
    only_open_days=True,   # note: only_open_days, not only_trade_days
))
```

## Last-day ticks

`ticker.get_trade_details()` → DataFrame `date` (intraday clock), `volume`, `price`. For a date range use module-level `tse.get_trade_details`.

## Export

```python
from pytse_client.ticker.export import export_ticker_history_as_csv, ticker_real_time_data_to_csv
export_ticker_history_as_csv(ticker).to_csv("history.csv")
ticker_real_time_data_to_csv(ticker).to_csv("realtime.csv")
```
