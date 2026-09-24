# Download API

All downloaders accept `symbols: str | list[str] | "all"`.

## Daily OHLCV

```python
import pytse_client as tse

frames = tse.download(symbols="all", write_to_csv=True)
tse.download(symbols="وبملت", write_to_csv=True, include_jdate=True)
tse.download(symbols=["وبملت", "ولملت"], adjust=True)
print(frames["ولملت"].tail())
```

Signature:

```
download(symbols, write_to_csv=False, include_jdate=False, base_path=config.DATA_BASE_PATH, adjust=False) -> Dict[str, DataFrame]
```

Behaviour:

- `"all"` expands via `symbols_data.all_symbols()`.
- Numeric strings that are not in the map are treated as raw TSETMC indexes.
- Old indexes are concatenated so a renamed symbol keeps its full history, then sorted by `date`.
- Thread pool: 10 workers, `requests_retry_session`.
- CSV name is `{symbol}.csv` or `{symbol}-ت.csv` when `adjust=True`.
- Incomplete downloads print a warning — rerun; do not invent missing frames.

Columns after `translations.HISTORY_FIELD_MAPPINGS`: `date, open, high, low, close, adjClose, yesterday, volume, count, value` plus optional `jdate`.

## Adjustment algorithm

`adjust_price(df)` walks days where today's `yesterday` ≠ previous `adjClose` (capital increase / dividend). It builds a reverse cumulative ratio and multiplies `open, high, low, close, adjClose, yesterday` on earlier ranges. Requires a non-empty `RangeIndex`. Always use adjusted series for returns, Sharpe, SMA crossovers.

## Client types (حقیقی / حقوقی)

```python
from pytse_client import download_client_types_records
records = download_client_types_records("فولاد", write_to_csv=True)
print(records["فولاد"].head())
```

Columns: `date`, `{individual,corporate}_{buy,sell}_{count,vol,value}`, `{individual,corporate}_{buy,sell}_mean_price`, `individual_ownership_change` (= corporate_sell_vol − corporate_buy_vol). Mean price is `value/vol` — plain float division, so it becomes `inf` on zero volume (`NaN` only when value is also 0).

## Financial indexes

```python
from pytse_client.download import download_financial_indexes
download_financial_indexes(symbols="all", write_to_csv=True, base_path="hello")
download_financial_indexes(symbols=["شاخص قيمت 50 شركت", "فني مهندسي"], include_jdate=True)
```

OHLCV + `date` + optional `jdate`. Index names live in `pytse_client/data/indices_name.json`.

## Symbol search

```python
from pytse_client.download import get_symbol_info, get_symbol_id
info = get_symbol_info("وبملت")  # MarketSymbol(code, symbol, name, index, old[])
```

Used internally when the bundled JSON misses a listing. `old` holds previous indexes (status flag `7 != "1"`).
