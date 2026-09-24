export type JsonSchema = {
  type: "object";
  properties: Record<
    string,
    {
      type: string | string[];
      description: string;
      enum?: string[];
      default?: unknown;
    }
  >;
  required?: string[];
};

export type ToolDef = {
  name: string;
  category: string;
  summary: string;
  pythonApi: string;
  script: string | null;
  inputSchema: JsonSchema;
  outputHint: string;
  example: string;
  pitfalls: string;
  sortOrder: number;
};

export const SKILL_META = {
  slug: "pytse-client",
  name: "pytse-client",
  version: "1.0.0",
  license: "GPL-3.0",
  author: "Milad Aghdak",
  authorUrl: "https://github.com/MiladAghdak",
  language: "python",
  sourceRepo: "https://github.com/Glyphack/pytse-client",
  sourceVersion: "0.19.1",
  allowedTools: "Bash Read Write",
  compatibility:
    "Requires Python 3.8+, the pytse-client package, and outbound HTTP to service.tsetmc.com / old.tsetmc.com / cdn.tsetmc.com. Persian (fa-IR) identifiers are first-class. Not for NYSE, crypto, or non-Iranian venues.",
  description:
    "Work with Tehran Stock Exchange (TSE / TSETMC / بورس تهران) data via pytse-client. Use when the user asks for Iranian stocks, Persian ticker symbols (فولاد, وبملت, شپنا, خودرو, خساپا), historical OHLCV, adjusted prices, realtime quotes, order book / five best bids-asks, tick/trade details, individual vs institutional (حقیقی حقوقی) flow, major shareholders, financial indexes (شاخص کل), filter-writing stats (فیلترنویسی), EPS/P/E/NAV/float shares, or exporting TSE CSVs. Do not use for NYSE, crypto, or non-Iranian markets.",
};

export const SKILL_FILES = [
  {
    path: "SKILL.md",
    kind: "instruction",
    title: "Skill entrypoint",
    summary: "YAML frontmatter + activation rules, decision tree, hard constraints.",
    loadWhen: "On skill activation (~2k tokens)",
  },
  {
    path: "LICENSE",
    kind: "license",
    title: "Skill license",
    summary: "GPL-3.0 notice — the skill wraps the GPLv3 pytse-client upstream.",
    loadWhen: "When redistributing or deriving from the skill",
  },
  {
    path: "references/ticker-api.md",
    kind: "reference",
    title: "Ticker API",
    summary: "Every Ticker property, realtime board, shareholders, float, trade ticks.",
    loadWhen: "When inspecting a single symbol",
  },
  {
    path: "references/download-api.md",
    kind: "reference",
    title: "Download API",
    summary: "Batch history, adjust=True algorithm, CSV layout, jdate.",
    loadWhen: "When downloading OHLCV or client types",
  },
  {
    path: "references/orderbook-and-trades.md",
    kind: "reference",
    title: "Order book & trades",
    summary: "get_orderbook, get_trade_details, timeframes, diff_orderbook.",
    loadWhen: "When the user wants the book or ticks",
  },
  {
    path: "references/financial-indexes.md",
    kind: "reference",
    title: "Financial indexes",
    summary: "شاخص کل and sector indexes, FinancialIndex class, intraday.",
    loadWhen: "When the user mentions شاخص",
  },
  {
    path: "references/filter-stats.md",
    kind: "reference",
    title: "Filter-writing stats",
    summary: "get_stats, market watch, flow codes, YVal instrument types.",
    loadWhen: "When building فیلترنویسی screens",
  },
  {
    path: "references/pitfalls.md",
    kind: "reference",
    title: "Pitfalls",
    summary: "IP bans, asyncio, Arabic/Persian letters, halted symbols, missing EPS.",
    loadWhen: "On errors, retries, or encoding issues",
  },
  {
    path: "references/symbols-and-markets.md",
    kind: "reference",
    title: "Symbols & markets",
    summary: "Flow codes, ISIN, delisted index override, all_symbols().",
    loadWhen: "When resolving a name or market segment",
  },
  {
    path: "references/agent-protocol.md",
    kind: "reference",
    title: "Agent protocol",
    summary: "JSON tool schemas, HTTP invoke contract, progressive disclosure.",
    loadWhen: "When calling the hosted skill HTTP API",
  },
  {
    path: "references/data-dictionary.md",
    kind: "reference",
    title: "Data dictionary",
    summary:
      "Exact columns, dtypes, and CSV/cache conventions for every DataFrame pytse-client returns.",
    loadWhen: "When parsing, validating, or persisting returned data",
  },
  {
    path: "scripts/_jsonio.py",
    kind: "script",
    title: "_jsonio.py",
    summary:
      "Private helpers shared by the bundled scripts: JSON output, error envelopes, frame normalization.",
    loadWhen: "Internal — imported by the scripts, never run directly",
  },
  {
    path: "scripts/download_history.py",
    kind: "script",
    title: "download_history.py",
    summary: "CLI: download OHLCV for one or all symbols as JSON.",
    loadWhen: "Execute, do not load into context",
  },
  {
    path: "scripts/ticker_snapshot.py",
    kind: "script",
    title: "ticker_snapshot.py",
    summary: "CLI: fundamentals + last board for one symbol.",
    loadWhen: "Execute, do not load into context",
  },
  {
    path: "scripts/client_types.py",
    kind: "script",
    title: "client_types.py",
    summary: "CLI: حقیقی/حقوقی history.",
    loadWhen: "Execute, do not load into context",
  },
  {
    path: "scripts/financial_index.py",
    kind: "script",
    title: "financial_index.py",
    summary: "CLI: index snapshot + history.",
    loadWhen: "Execute, do not load into context",
  },
  {
    path: "scripts/get_orderbook.py",
    kind: "script",
    title: "get_orderbook.py",
    summary: "CLI: historical five-level book.",
    loadWhen: "Execute, do not load into context",
  },
  {
    path: "scripts/get_trade_details.py",
    kind: "script",
    title: "get_trade_details.py",
    summary: "CLI: ticks or aggregated intraday bars.",
    loadWhen: "Execute, do not load into context",
  },
  {
    path: "scripts/get_stats.py",
    kind: "script",
    title: "get_stats.py",
    summary: "CLI: key stats universe for filter writing.",
    loadWhen: "Execute, do not load into context",
  },
  {
    path: "scripts/resolve_symbol.py",
    kind: "script",
    title: "resolve_symbol.py",
    summary: "CLI: search TSETMC and normalize Arabic/Persian letters.",
    loadWhen: "Execute, do not load into context",
  },
  {
    path: "scripts/smoke.py",
    kind: "script",
    title: "smoke.py",
    summary: "Offline runtime self-test: imports, symbols corpus, known-symbol resolution.",
    loadWhen: "After install, to verify the runtime",
  },
  {
    path: "scripts/ticker_snapshot.py",
    kind: "script",
    title: "ticker_snapshot.py",
    summary: "CLI: fundamentals + last board for one symbol.",
    loadWhen: "Execute, do not load into context",
  },
  {
    path: "assets/tools.json",
    kind: "asset",
    title: "tools.json",
    summary: "Machine-readable tool catalog matching this studio.",
    loadWhen: "When registering tools with a host agent",
  },
] as const;

const symbolProp = {
  type: "string",
  description: "Persian ticker symbol, e.g. فولاد or وبملت. Arabic letters are normalized.",
};

export const TOOLS: ToolDef[] = [
  {
    name: "all_symbols",
    category: "universe",
    summary: "List every symbol known to pytse-client (from bundled symbols_name.json plus live appends).",
    pythonApi: "pytse_client.all_symbols()",
    script: null,
    inputSchema: { type: "object", properties: {} },
    outputHint: "string[] of Persian symbols",
    example: "from pytse_client import all_symbols\nprint(sorted(all_symbols())[:20])",
    pitfalls: "The bundled JSON can lag newly listed names; Ticker() will still resolve via TSETMC search.",
    sortOrder: 1,
  },
  {
    name: "resolve_symbol",
    category: "universe",
    summary: "Resolve a Persian name to TSETMC index, ISIN-adjacent ids, and old indexes for delisted rows.",
    pythonApi: "pytse_client.download.get_symbol_info(symbol)",
    script: "scripts/resolve_symbol.py",
    inputSchema: {
      type: "object",
      properties: { symbol: symbolProp },
      required: ["symbol"],
    },
    outputHint: "{ symbol, index, name, old[] }",
    example: 'python scripts/resolve_symbol.py "وبملت"',
    pitfalls: "If the name is delisted, pass index= to Ticker() instead of relying on search.",
    sortOrder: 2,
  },
  {
    name: "download_history",
    category: "history",
    summary: "Download daily OHLCV for one, many, or all symbols. Optional Jalali column and split-adjusted prices.",
    pythonApi: "tse.download(symbols, write_to_csv=False, include_jdate=False, adjust=False)",
    script: "scripts/download_history.py",
    inputSchema: {
      type: "object",
      properties: {
        symbol: symbolProp,
        adjust: {
          type: "boolean",
          description: "Apply capital-increase / dividend performance adjustment.",
          default: false,
        },
        include_jdate: {
          type: "boolean",
          description: "Append Jalali jdate column.",
          default: false,
        },
        limit: {
          type: "integer",
          description: "Max rows to return, most-recent first after reverse.",
        },
      },
      required: ["symbol"],
    },
    outputHint:
      "Array of {date,open,high,low,close,adjClose,yesterday,volume,count,value} (+jdate when include_jdate=True)",
    example: 'tse.download(symbols=["وبملت","فولاد"], adjust=True, include_jdate=True)',
    pitfalls:
      "Adjustment uses adjClose vs next-day yesterday. Empty frames are logged and skipped, so the returned dict can be shorter than the input list.",
    sortOrder: 3,
  },
  {
    name: "download_client_types",
    category: "flow",
    summary: "Retail (حقیقی) vs institutional (حقوقی) daily buy/sell counts, volumes, values, and ownership change.",
    pythonApi: "tse.download_client_types_records(symbols, write_to_csv=False, include_jdate=False)",
    script: "scripts/client_types.py",
    inputSchema: {
      type: "object",
      properties: { symbol: symbolProp },
      required: ["symbol"],
    },
    outputHint: "Daily client-type records including individual_ownership_change",
    example: 'download_client_types_records("فولاد")',
    pitfalls: "Mean prices are value/vol and can be NaN on zero volume. Some days are missing.",
    sortOrder: 4,
  },
  {
    name: "download_financial_indexes",
    category: "index",
    summary: "Download OHLCV history for TSE financial indexes, or all of them.",
    pythonApi: "tse.download_financial_indexes(symbols, write_to_csv=False, include_jdate=False)",
    script: "scripts/financial_index.py",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description:
            'Index name matching indices_name.json (Arabic-normalized), e.g. "شاخص كل", or "all". Persian letters are normalized via replace_persian before lookup.',
        },
      },
      required: ["symbol"],
    },
    outputHint: "OHLCV + date + jdate",
    example: 'download_financial_indexes(symbols="شاخص كل", include_jdate=True)',
    pitfalls:
      "Names must match indices_name.json keys, which are Arabic-normalized (Arabic kaf ك): شاخص كل, شاخص كل (هم وزن). download_financial_indexes normalizes Persian input; FinancialIndex(symbol=…) does not.",
    sortOrder: 5,
  },
  {
    name: "financial_index_snapshot",
    category: "index",
    summary: "Live-ish snapshot of an index: last_value, last_update, high, low, history, intraday_price.",
    pythonApi: "tse.FinancialIndex(symbol)",
    script: "scripts/financial_index.py",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description:
            'Arabic-normalized index name such as "شاخص كل" — the constructor does NOT normalize Persian letters.',
        },
      },
      required: ["symbol"],
    },
    outputHint: "{ last_value, last_update, high, low, history[] }",
    example: 'tse.FinancialIndex("شاخص كل").last_value',
    pitfalls:
      "Intraday table parses parentheses as negatives; commas stripped. Unlike download_financial_indexes, FinancialIndex(symbol=…) does not normalize — the Persian-kaf spelling شاخص کل silently resolves index=None.",
    sortOrder: 6,
  },
  {
    name: "ticker_snapshot",
    category: "ticker",
    summary: "Full Ticker board: title, group, EPS, P/E, NAV, float, market cap, best bid/ask, state, last prices.",
    pythonApi: "tse.Ticker(symbol, index=None, adjust=False)",
    script: "scripts/ticker_snapshot.py",
    inputSchema: {
      type: "object",
      properties: {
        symbol: symbolProp,
        index: {
          type: "string",
          description:
            "TSETMC instrument index — pass for delisted symbols via Ticker('', index=…).",
        },
        adjust: { type: "boolean", description: "Load adjusted history.", default: false },
      },
      required: ["symbol"],
    },
    outputHint: "Fundamentals + last trade fields + best demand/supply",
    example: 'ticker = tse.Ticker("نوری")\nprint(ticker.eps, ticker.p_e_ratio, ticker.market_cap)',
    pitfalls: "Funds have NAV; producers have PSR. آسام-like names may lack EPS/P/E. Constructor downloads history.",
    sortOrder: 7,
  },
  {
    name: "ticker_realtime",
    category: "ticker",
    summary: "Five-level live book plus last trade, state, and حقیقی/حقوقی trade summaries.",
    pythonApi: "ticker.get_ticker_real_time_info_response()",
    script: "scripts/ticker_snapshot.py",
    inputSchema: {
      type: "object",
      properties: { symbol: symbolProp },
      required: ["symbol"],
    },
    outputHint: "RealtimeTickerInfo with buy_orders, sell_orders, individual/corporate summaries",
    example:
      "try:\n    rt = ticker.get_ticker_real_time_info_response()\nexcept RuntimeError:\n    print('deactivated or delisted — no live board')",
    pitfalls:
      "RuntimeError fires only for deactivated/delisted symbols (current index listed in old[]). Halted symbols (ممنوع-متوقف etc.) still return a board — read .state.",
    sortOrder: 8,
  },
  {
    name: "ticker_shareholders",
    category: "ownership",
    summary: "Current major shareholders table. Float ≈ 100 - sum(percentage).",
    pythonApi: "ticker.shareholders",
    script: "scripts/ticker_snapshot.py",
    inputSchema: {
      type: "object",
      properties: { symbol: symbolProp },
      required: ["symbol"],
    },
    outputHint: "[{ id, shareholder, shares, percentage, change }]",
    example: "print(100 - ticker.shareholders.percentage.sum())  # float",
    pitfalls: "Percentages are major holders only; true free float also uses ticker.float_shares.",
    sortOrder: 9,
  },
  {
    name: "ticker_shareholders_history",
    category: "ownership",
    summary: "Daily major-holder history. Slow. Do not parallelize across symbols.",
    pythonApi: "ticker.get_shareholders_history(from_when, to_when, only_trade_days=True)",
    script: null,
    inputSchema: {
      type: "object",
      properties: {
        symbol: symbolProp,
        days: { type: "integer", description: "Lookback in days (default 90).", default: 90 },
      },
      required: ["symbol"],
    },
    outputHint: "Rows of date, shareholder_id, shares, percentage, name, change",
    example:
      "ticker.get_shareholders_history(from_when=datetime.timedelta(days=90), only_trade_days=True)",
    pitfalls:
      "TSETMC bans IPs that hammer this. Inside a running loop use get_shareholders_history_async. 500s are retried.",
    sortOrder: 10,
  },
  {
    name: "ticker_trade_details",
    category: "intraday",
    summary: "Last trading day's tick tape for a symbol (time, volume, price).",
    pythonApi: "ticker.get_trade_details()",
    script: null,
    inputSchema: {
      type: "object",
      properties: {
        symbol: symbolProp,
        index: {
          type: "string",
          description:
            "TSETMC instrument index — pass for delisted symbols via Ticker('', index=…).",
        },
      },
      required: ["symbol"],
    },
    outputHint: "[{ date: HH:MM:SS, volume, price }] — last session's ticks only",
    example: 'tse.Ticker("نوری").get_trade_details().tail()',
    pitfalls: "This is last session only. For a date range use module-level get_trade_details.",
    sortOrder: 11,
  },
  {
    name: "get_trade_details",
    category: "intraday",
    summary: "Historical ticks or aggregated intraday bars (30s, 1m, 5m, 10m, 15m, 30m, 1h) for a date range.",
    pythonApi:
      "tse.get_trade_details(symbol, start_date, end_date=None, to_csv=False, timeframe=None, aggregate=False)",
    script: "scripts/get_trade_details.py",
    inputSchema: {
      type: "object",
      properties: {
        symbol: symbolProp,
        start_date: { type: "string", description: "YYYY-MM-DD" },
        end_date: { type: "string", description: "YYYY-MM-DD" },
        timeframe: {
          type: "string",
          description: "Aggregation bucket.",
          enum: ["30s", "1m", "5m", "10m", "15m", "30m", "1h"],
        },
        aggregate: {
          type: "boolean",
          description: "Collapse to a single DataFrame.",
          default: false,
        },
      },
      required: ["symbol", "start_date"],
    },
    outputHint: "Ticks or OHLCV bars keyed by day unless aggregate=True",
    example:
      'tse.get_trade_details("اهرم", date(2023,3,19), date(2023,4,22), aggregate=True, timeframe="1m")',
    pitfalls:
      "Default timeframe=None returns raw ticks and can be huge. With to_csv=True and base_path=None, CSVs land in trade_details_history/.",
    sortOrder: 12,
  },
  {
    name: "get_orderbook",
    category: "intraday",
    summary: "Historical five-level order book between two dates. Optional diff-only faster payload.",
    pythonApi:
      "tse.get_orderbook(symbol, start_date, end_date=None, to_csv=False, ignore_date_validation=False, diff_orderbook=False, async_requests=True)",
    script: "scripts/get_orderbook.py",
    inputSchema: {
      type: "object",
      properties: {
        symbol: symbolProp,
        start_date: { type: "string", description: "YYYY-MM-DD" },
        end_date: { type: "string", description: "YYYY-MM-DD" },
        diff_orderbook: {
          type: "boolean",
          description: "Store only book deltas (faster, less explicit).",
          default: false,
        },
      },
      required: ["symbol", "start_date"],
    },
    outputHint: "dict[date -> DataFrame] of bid/ask levels",
    example:
      'get_orderbook("خساپا", date(2023,3,1), date(2023,4,4), ignore_date_validation=True)',
    pitfalls: "ignore_date_validation if start/end might not be trading days. async_requests=False is slower.",
    sortOrder: 13,
  },
  {
    name: "get_asks_and_bids",
    category: "intraday",
    summary:
      "Market-wide top-of-book snapshot from MarketWatchInit — no symbol parameter; filter the returned frame by symbol.",
    pythonApi: "tse.get_asks_and_bids(to_csv=False, base_path=None)",
    script: null,
    inputSchema: { type: "object", properties: {} },
    outputHint:
      "Market-wide DataFrame: id, row_number, num_of_sellers, number_of_buyers, buy_price, sell_price, buy_volume, sell_volume, symbol",
    example:
      'from pytse_client import get_asks_and_bids\n\ndf = get_asks_and_bids()\nprint(df[df.symbol == "فولاد"])',
    pitfalls:
      "Covers only symbols present in the bundled symbols_name.json. Values are empty outside the trading session.",
    sortOrder: 14,
  },
  {
    name: "get_stats",
    category: "screener",
    summary:
      "Universe key statistics used for TSETMC filter-writing: averages, client types, market-watch fields.",
    pythonApi: "tse.get_stats(base_path=None, to_csv=False)",
    script: "scripts/get_stats.py",
    inputSchema: { type: "object", properties: {} },
    outputHint: "DataFrame of key stats + client types + market watch for all known symbols",
    example: "key_stats = get_stats(to_csv=False)\nprint(key_stats.columns)",
    pitfalls: "Some fields are missing for some names; market watch parse can fail if TSETMC changes layout.",
    sortOrder: 15,
  },
  {
    name: "ticker_total_shares_history",
    category: "ownership",
    summary: "Async history of share count (capital increases).",
    pythonApi:
      "await ticker.get_total_shares_history_async(from_when, to_when, only_open_days=True)",
    script: null,
    inputSchema: {
      type: "object",
      properties: {
        symbol: symbolProp,
        days: { type: "integer", description: "Lookback days (default 60).", default: 60 },
      },
      required: ["symbol"],
    },
    outputHint: "[{ date, total_shares }]",
    example:
      "result = asyncio.run(ticker.get_total_shares_history_async(from_when=timedelta(days=60)))",
    pitfalls: "Must be awaited. Default lookback in docs is 60 days.",
    sortOrder: 16,
  },
];

export const EVAL_CASES = [
  {
    prompt: "قیمت تعدیل‌شده فولاد را از ۲۰۲۰ تا امروز بگیر",
    language: "fa",
    shouldTrigger: true,
    expectedTool: "download_history",
    notes: "Persian + adjust implied by تعدیل‌شده.",
  },
  {
    prompt: "Show Bank Mellat (وبملت) P/E, EPS, float and major holders",
    language: "en",
    shouldTrigger: true,
    expectedTool: "ticker_snapshot",
    notes: "Fundamentals + shareholders.",
  },
  {
    prompt: "شاخص کل امروز چنده و از اول سال چقدر آمده؟",
    language: "fa",
    shouldTrigger: true,
    expectedTool: "financial_index_snapshot",
    notes: "Index, not a stock.",
  },
  {
    prompt: "حقیقی‌ها امروز در خودرو خریدار بودند یا فروشنده؟",
    language: "fa",
    shouldTrigger: true,
    expectedTool: "download_client_types",
    notes: "Retail vs institutional flow.",
  },
  {
    prompt: "Get 1-minute bars for اهرم between 19 Mar and 22 Apr 2023",
    language: "en",
    shouldTrigger: true,
    expectedTool: "get_trade_details",
    notes: "Intraday aggregation.",
  },
  {
    prompt: "Download five-level order book of خساپا for March 2023",
    language: "en",
    shouldTrigger: true,
    expectedTool: "get_orderbook",
    notes: "Historical book.",
  },
  {
    prompt: "Build a فیلترنویسی screen for high average buyers over 3 months",
    language: "fa",
    shouldTrigger: true,
    expectedTool: "get_stats",
    notes: "Key stats universe.",
  },
  {
    prompt: "What is the free float of وبملت using major shareholders?",
    language: "en",
    shouldTrigger: true,
    expectedTool: "ticker_shareholders",
    notes: "100 - sum(percentage).",
  },
  {
    prompt: "Fetch AAPL daily candles from Yahoo Finance",
    language: "en",
    shouldTrigger: false,
    expectedTool: null,
    notes: "US equity — must NOT trigger this skill.",
  },
  {
    prompt: "Plot BTC-USDT funding rate on Binance",
    language: "en",
    shouldTrigger: false,
    expectedTool: null,
    notes: "Crypto — must NOT trigger.",
  },
  {
    prompt: "نماد حذف‌شده را با index دستی لود کن",
    language: "fa",
    shouldTrigger: true,
    expectedTool: "resolve_symbol",
    notes: "Delisted path, index= required.",
  },
  {
    prompt: "Why did asyncio.run fail inside my FastAPI route for shareholders history?",
    language: "en",
    shouldTrigger: true,
    expectedTool: "ticker_shareholders_history",
    notes: "Must load pitfalls + async variant.",
  },
];
