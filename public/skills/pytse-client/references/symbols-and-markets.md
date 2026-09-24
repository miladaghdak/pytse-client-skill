# Symbols and markets

## Bundled universe

`pytse_client/data/symbols_name.json` (1,394 entries) maps Persian symbol → `{index, code, name, old[]}`. `tse.all_symbols()` returns the key set. Newly listed names may be absent until the JSON is regenerated; `get_symbol_info` appends them at runtime. Module surface: `symbols_data.symbols_information()` (full map), `get_ticker_index`, `get_ticker_old_index`, `all_symbols`, plus the index-side `get_financial_index` / `all_financial_index`. Regeneration: `python -m pytse_client.scripts.update_symbols_json`.

Index universe: `pytse_client/data/indices_name.json` (55 entries, Arabic-normalized keys).

## Resolving a name

1. `normalize(ي→ی, ك→ک)`
2. `symbols_data.get_ticker_index(symbol)`
3. Else `get_symbol_info(symbol)` (TSETMC search `tsev2/data/search.aspx?skey=`)
4. Else ask the user for the numeric index (delisted)

## Flow (market)

| Code | Title |
|---|---|
| 0 | عمومی - مشترک بین بورس و فرابورس |
| 1 | بورس |
| 2 | فرابورس |
| 3 | آتی (futures) |
| 4 | پایه فرابورس |
| 5 | پایه فرابورس (منتشر نمی شود) |

Codes 6+ are not mapped by `Ticker._flow_name` — the property returns `""` for them.

## Instrument id vs index

- **index** (`i=`): numeric, used in almost every URL (`35425587644337450`)
- **instrument_id / CIsin**: `IRO1….` style, used for shareholders (`Partree=15131T&c=`)

## Session clock

Cash equities: 09:00–12:30 Tehran time, Sat–Wed. Pre-open and closing auction exist; tick tapes often start `09:00:20` and end `12:29:59`.

## Famous symbols (for tests)

فولاد, وبملت, شپنا, خودرو, خساپا, فارس, نوری, شستا, وغدیر, اهرم, کگل, کچاد, ولملت.
