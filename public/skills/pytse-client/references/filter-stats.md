# Filter-writing stats (`get_stats`)

TSETMC market-watch (دیده‌بان بازار) exposes JavaScript filter fields. `get_stats()` joins three feeds for every symbol in the package map:

1. Key statistics (`InstValue.aspx?t=a`) — rolling averages used in فیلترنویسی
2. Client types all (`ClientTypeAll.aspx`)
3. Market watch init (`MarketWatchInit.aspx?h=0&r=0`)

```python
from pytse_client import get_stats
key_stats = get_stats(base_path="hello", to_csv=True)
# DataFrame, one row per symbol
```

Client-type columns (9):

```
index, numof_individual_buy, numof_corporate_buy,
vol_individual_buy, vol_corporate_buy,
numof_individual_sell, numof_corporate_sell,
vol_individual_sell, vol_corporate_sell
```

Market-watch columns (23): `index, code, symbol, name, last_changed, open_price, adj_closing_price, last_price, number_of_trans, volume_of_trans, value_of_trans, min_price, max_price, yesterday_price, EPS, base_volume, visit_count, flow, group_number, max_price_allowed, min_price_allowed, number_of_stocks, yval`. (No `max_year` here — that is a Ticker instrument-page property.)

With the 89 key-stat fields the joined frame carries ~121 columns per symbol.

Key-stat averages include fields such as `ave_numof_buyer_last_12_month`, `ave_numof_buyer_last_3_month`, `ave_numof_corporation_buyer_last_12_month`, … (full map in `pytse_client/ticker_statisticals`).

Some cells are missing — they were missing on TSETMC too. Coerce with pandas; never fabricate.

## Flow codes (`flow`)

Mapped by `Ticker._flow_name`; anything else returns `""`:

| Code | Market |
|---|---|
| 0 | عمومی - مشترک بین بورس و فرابورس (common to TSE & IFB) |
| 1 | بورس (TSE) |
| 2 | فرابورس (IFB) |
| 3 | آتی (futures) |
| 4 | پایه فرابورس (IFB base) |
| 5 | پایه فرابورس (منتشر نمی شود) (IFB base, unpublished) |

## YVal

Instrument kind (index, rights, futures, …). Canonical list: https://tsetmc.com/StaticContent/WS-Instrument
