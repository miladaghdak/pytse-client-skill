# Order book and trade details

## Historical order book

```python
from datetime import date
from pytse_client import get_orderbook

df_dict = get_orderbook(
    "خساپا",
    start_date=date(2023, 3, 1),
    end_date=date(2023, 4, 4),
    to_csv=True,
    ignore_date_validation=True,
    diff_orderbook=False,
    async_requests=True,
)
# df_dict: dict[date_str, DataFrame]
```

Defaults: `end_date=None` (same as start), `to_csv=False`, `base_path=None`, `ignore_date_validation=False`, `diff_orderbook=False`, `async_requests=True`.

- `ignore_date_validation=True` when you are not sure start/end are trading days.
- `diff_orderbook=True` is faster and stores only deltas — the book is not fully materialised at each timestamp.
- `async_requests=False` serialises HTTP and is slower; use it only if the async path misbehaves in the host.

Endpoint family: `http://cdn.tsetmc.com/api/BestLimits/{index}/{date}`.

## Last-day ticks on Ticker

```python
ticker = tse.Ticker("نوری")
print(ticker.get_trade_details().tail())
# date (09:00:20 … 12:29:59), volume, price
```

## Historical ticks / intraday bars

```python
from datetime import date
import pytse_client as tse

df = tse.get_trade_details(
    "اهرم",
    start_date=date(2023, 3, 19),
    end_date=date(2023, 4, 22),
    to_csv=True,
    aggregate=True,
    timeframe="1m",
)
```

Parameters:

| Name | Notes |
|---|---|
| `symbol_name` | Persian ticker |
| `start_date` | required |
| `end_date` | defaults to start |
| `to_csv` | default False |
| `base_path` | default `None` → CSVs land in `trade_details_history/` |
| `timeframe` | `None` (raw ticks) or `30s`, `1m`, `5m`, `10m`, `15m`, `30m`, `1h` |
| `aggregate` | collapse to one DataFrame |

Return type is `Dict[str, DataFrame]` keyed by `datetime.date`; with `aggregate=True` it is a single-entry dict: `{"aggregate": concatenated_df}` — read `result["aggregate"]`, not the dict itself.

Raw ticks for a busy name over weeks will blow context. Prefer `timeframe="1m"` and summarise.

Endpoint family: `http://cdn.tsetmc.com/api/Trade/GetTradeHistory/{index}/{date}/true`.

## Market-wide top of book

`from pytse_client import get_asks_and_bids` — one market-wide top-of-book snapshot parsed from `MarketWatchInit`, **no symbol parameter**. Returns a DataFrame with columns `id, row_number, num_of_sellers, number_of_buyers, buy_price, sell_price, buy_volume, sell_volume, symbol`, filtered to symbols bundled in the package. For one name, filter client-side:

```python
book = get_asks_and_bids()
khodro = book[book["symbol"] == "خودرو"]
```

Not historical — a single live snapshot.
