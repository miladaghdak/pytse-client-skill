# Financial indexes

Index names: see TSETMC tree `Partree=151315&Flow=1` and `pytse_client/data/indices_name.json` (55 entries). The JSON keys are **Arabic-normalized**: common ones are `شاخص كل` (Arabic `ك`), `شاخص كل (هم وزن)` — with parentheses — `شاخص قيمت 50 شركت`, and sector names such as `فني مهندسي`. `download_financial_indexes` normalises Persian input for you (`replace_persian`); `FinancialIndex(symbol=...)` does NOT — the Persian spelling `شاخص کل` silently resolves to `index=None` and breaks every intraday member.

## Batch history

```python
from pytse_client.download import download_financial_indexes
download_financial_indexes(symbols="all", write_to_csv=True, include_jdate=True)
```

Returns `Dict[str, DataFrame]` with `date, high, low, open, close, volume` + optional `jdate`. Index names live in `pytse_client/data/indices_name.json`.

## FinancialIndex class

Mirrors `Ticker`:

```python
idx = tse.FinancialIndex(symbol="شاخص كل")   # Arabic-normalized key — matches indices_name.json
# FinancialIndex does NOT normalise Persian input; the Persian spelling
# شاخص کل silently yields index=None. Prefer the Arabic key, or pass the id:
idx = tse.FinancialIndex(symbol="", index="32097828799138957")
idx.history          # daily OHLCV — jdate ALWAYS included (include_jdate=True is hardcoded)
idx.intraday_price   # time-indexed: value, change_percentage, low, high
idx.low              # session low (string from HTML, commas possible)
idx.high
idx.last_value       # float
idx.last_update      # "HH:MM"
idx.contributing_symbols  # [{symbol, index}, …]
```

Intraday parser strips thousands-separators and converts `(3)` to `-3`.

Pass `index=` if you already know the numeric id. `write_history=True` persists CSV under the financial-index base path.
