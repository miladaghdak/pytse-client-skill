/**
 * Parsers for the TSETMC response formats.
 *
 * Every field position below was verified against a live response from
 * this host. They mirror the parsing in pytse-client v0.19.1 exactly
 * (`ticker/ticker.py`, `ticker/api_extractors.py`, `ticker/download.py`)
 * so a Web UI answer and a Python answer describe the same number.
 *
 * No I/O lives here — see `live.ts` for the fetches.
 */

export type LiveOrder = { count: number; volume: number; price: number };

export type LiveTradeSummary = {
  buy_count: number;
  buy_vol: number;
  sell_count: number;
  sell_vol: number;
};

export type LiveBoard = {
  state: string;
  last_price: number;
  adj_close: number;
  yesterday_price: number;
  open_price: number;
  high_price: number;
  low_price: number;
  count: number;
  volume: number;
  value: number;
  last_date: string;
  last_time: string;
  nav_date: string;
  nav: number;
  buy_orders: LiveOrder[];
  sell_orders: LiveOrder[];
  individual_trade_summary: LiveTradeSummary | null;
  corporate_trade_summary: LiveTradeSummary | null;
};

/** `I `=banned, `A `=allowed, `G` suffix=blocked, `S`=halted, `R`=reserved. */
const INSTRUMENT_STATES: Record<string, string> = {
  "I ": "ممنوع",
  "A ": "مجاز",
  AG: "مجاز-مسدود",
  AS: "مجاز-متوقف",
  AR: "مجاز-محفوظ",
  IG: "ممنوع-مسدود",
  IS: "ممنوع-متوقف",
  IR: "ممنوع-محفوظ",
};

export function instrumentState(code: string): string {
  return INSTRUMENT_STATES[code] ?? code;
}

function n(value: string | undefined): number {
  if (value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** `20260926` -> `2026-09-26`; anything else is passed through unchanged. */
export function isoDate(compact: string): string {
  if (!/^\d{8}$/.test(compact)) return compact;
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

/** `123000` -> `12:30:00`; `60128` -> `06:01:28`. */
export function clockTime(compact: string | number): string {
  const digits = String(compact).padStart(6, "0");
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4, 6)}`;
}

function rows(text: string): string[][] {
  return text
    .split(";")
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => row.split(","));
}

/**
 * `instinfofast.aspx` — the realtime board.
 *
 * §0 comma fields: 1=state 2=last 3=adjClose 4=open 5=yesterday 6=high 7=low
 * 8=count 9=volume 10=value 12=lastDate 13=lastTime 14=navDate 15=nav
 * §2 orders, §4 individual (0/3/5/8) + corporate (1/4/6/9) trade summaries.
 */
export function parseBoard(text: string): LiveBoard | null {
  const sections = text.split(";").map((s) => s.trim());
  const head = sections[0]?.split(",");
  if (!head || head.length < 11) return null;

  const orderFields = sections[2]
    ? sections[2].split(",").filter((f) => f.trim() !== "")
    : [];
  const buyOrders: LiveOrder[] = [];
  const sellOrders: LiveOrder[] = [];
  for (const order of orderFields) {
    const p = order.split("@");
    if (p.length < 6) continue;
    buyOrders.push({ count: n(p[0]), volume: n(p[1]), price: n(p[2]) });
    sellOrders.push({ count: n(p[5]), volume: n(p[4]), price: n(p[3]) });
  }

  const summary = sections[4] ? sections[4].split(",") : [];
  const hasBoth = summary.length >= 10;
  const ind = hasBoth
    ? {
        buy_vol: n(summary[0]),
        sell_vol: n(summary[3]),
        buy_count: n(summary[5]),
        sell_count: n(summary[8]),
      }
    : null;
  const corp = hasBoth
    ? {
        buy_vol: n(summary[1]),
        sell_vol: n(summary[4]),
        buy_count: n(summary[6]),
        sell_count: n(summary[9]),
      }
    : null;

  return {
    state: instrumentState(head[1] ?? ""),
    last_price: n(head[2]),
    adj_close: n(head[3]),
    open_price: n(head[4]),
    yesterday_price: n(head[5]),
    high_price: n(head[6]),
    low_price: n(head[7]),
    count: n(head[8]),
    volume: n(head[9]),
    value: n(head[10]),
    last_date: isoDate(head[12] ?? ""),
    last_time: clockTime(head[13] ?? ""),
    nav_date: isoDate(head[14] ?? ""),
    nav: n(head[15]),
    buy_orders: buyOrders,
    sell_orders: sellOrders,
    individual_trade_summary: ind
      ? {
          buy_count: ind.buy_count,
          buy_vol: ind.buy_vol,
          sell_count: ind.sell_count,
          sell_vol: ind.sell_vol,
        }
      : null,
    corporate_trade_summary: corp
      ? {
          buy_count: corp.buy_count,
          buy_vol: corp.buy_vol,
          sell_count: corp.sell_count,
          sell_vol: corp.sell_vol,
        }
      : null,
  };
}

export type LiveBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  /** `<LAST>` — the day's last trade, split-unaware. */
  close: number;
  /** `<CLOSE>` — the exchange's own adjusted close. */
  adjClose: number;
  volume: number;
  value: number;
  count: number;
  /** `<OPEN>` — yesterday's close, NOT the day's open (TSETMC mislabels it). */
  yesterday: number;
};

/**
 * `Export-txt.aspx` — the full daily history CSV, 12 comma fields per row.
 *
 * The column order is the CSV's own header, which does **not** match the frame
 * pytse-client builds from it. The wire layout (verified against a live فولاد
 * export and cross-checked against `instinfofast` for the same day):
 *
 *   0 `<TICKER>` 1 `<DTYYYYMMDD>` 2 `<FIRST>` 3 `<HIGH>` 4 `<LOW>` 5 `<CLOSE>`
 *   6 `<VALUE>` 7 `<VOL>` 8 `<OPENINT>` 9 `<PER>` 10 `<OPEN>` 11 `<LAST>`
 *
 * Translated to pytse-client's frame columns exactly as `translations.py`
 * does: `<FIRST>`→open, `<HIGH>`→high, `<LOW>`→low, `<CLOSE>`→adjClose,
 * `<VALUE>`→value, `<VOL>`→volume, `<OPENINT>`→count, `<OPEN>`→yesterday,
 * `<LAST>`→close. Two traps, both called out upstream: TSETMC's `<OPEN>` holds
 * yesterday's close rather than the day's open, and `<CLOSE>` (adjClose) is
 * the adjusted value while `<LAST>` (close) is the raw last trade.
 *
 * The single header line is filtered out by requiring 8 digits in the date
 * field; a file can also repeat it, which the same guard catches.
 */
export function parseHistoryCsv(text: string): LiveBar[] {
  const bars: LiveBar[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const f = line.split(",");
    // 12-field data rows only; the `<DTYYYYMMDD>` header fails the date test.
    if (f.length < 12 || !/^\d{8}$/.test(f[1].trim())) continue;
    bars.push({
      date: isoDate(f[1].trim()),
      open: n(f[2]),
      high: n(f[3]),
      low: n(f[4]),
      adjClose: n(f[5]),
      value: n(f[6]),
      volume: n(f[7]),
      count: n(f[8]),
      yesterday: n(f[10]),
      close: n(f[11]),
    });
  }
  return bars;
}

/**
 * `clienttype.aspx` — daily حقیقی/حقوقی flow, oldest first.
 * 0=date 1..4=buy/sell counts 5..8=buy/sell volumes 9..12=buy/sell values.
 */
export function parseClientTypes(text: string) {
  return rows(text)
    .filter((f) => /^\d{8}$/.test(f[0]))
    .map((f) => {
      const vol = {
        individual_buy: n(f[5]),
        corporate_buy: n(f[6]),
        individual_sell: n(f[7]),
        corporate_sell: n(f[8]),
      };
      const value = {
        individual_buy: n(f[9]),
        corporate_buy: n(f[10]),
        individual_sell: n(f[11]),
        corporate_sell: n(f[12]),
      };
      const mean = (v: number, volume: number) => (volume ? v / volume : 0);
      return {
        date: isoDate(f[0]),
        individual_buy_count: n(f[1]),
        corporate_buy_count: n(f[2]),
        individual_sell_count: n(f[3]),
        corporate_sell_count: n(f[4]),
        individual_buy_vol: vol.individual_buy,
        corporate_buy_vol: vol.corporate_buy,
        individual_sell_vol: vol.individual_sell,
        corporate_sell_vol: vol.corporate_sell,
        individual_buy_value: value.individual_buy,
        corporate_buy_value: value.corporate_buy,
        individual_sell_value: value.individual_sell,
        corporate_sell_value: value.corporate_sell,
        individual_buy_mean_price: mean(value.individual_buy, vol.individual_buy),
        individual_sell_mean_price: mean(value.individual_sell, vol.individual_sell),
        corporate_buy_mean_price: mean(value.corporate_buy, vol.corporate_buy),
        corporate_sell_mean_price: mean(value.corporate_sell, vol.corporate_sell),
        individual_ownership_change: vol.corporate_sell - vol.corporate_buy,
      };
    });
}

/**
 * The 26 `MarketWatchInit.aspx` columns, in wire order.
 *
 * Verified against فولاد and شپترو. Two naming notes: field 4 is the last
 * trade time (`123000`), not a delta; and field 5 repeats field 12 (the
 * session high) rather than carrying an open, because the board has no open
 * column at all. Fields 15 and 22 are unnamed upstream flags/counters, and
 * 23–24 are padding.
 */
export const MARKET_WATCH_FIELDS = [
  "index",
  "code",
  "symbol",
  "name",
  "time",
  "high_price",
  "adj_closing_price",
  "last_price",
  "number_of_trans",
  "volume_of_trans",
  "value_of_trans",
  "min_price",
  "max_price",
  "yesterday_price",
  "EPS",
  "price_allowed",
  "base_volume",
  "flow",
  "group_number",
  "max_price_allowed",
  "min_price_allowed",
  "number_of_stocks",
  "visits",
  "_pad1",
  "_pad2",
  "yval",
] as const;

export type LiveMarketRow = {
  [K in (typeof MARKET_WATCH_FIELDS)[number]]: string;
};

/**
 * `MarketWatchInit` — the whole board in one body, ~450 KB.
 *
 * The wire format is not one record per instrument. It is ~3,800 instrument
 * rows of 26 fields, then ~18,000 *book* rows of 8 fields
 * (`index,level,count,direction,bid,ask,bidVolume,askValue`) for the five
 * levels of every name, separated by `;`. A couple of commodity/fund blocks
 * additionally glue an instrument row on behind an `@`.
 *
 * Taking rows on field 0 alone therefore reads a book row as a price: the
 * fifth ask row of فولاد is `…,5,29,1,3160,3290,2138,3816977`, and its
 * ask *value* lands in the last-price slot. Two guards fix that: split on
 * `;` **and** `@`, and require an ISIN-shaped field 1, which every real
 * instrument row has and no book row does.
 */
export function parseMarketWatch(text: string): LiveMarketRow[] {
  return text
    .split(/[;@]/)
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => record.split(","))
    .filter(
      (f) =>
        /^\d{10,}$/.test((f[0] ?? "").trim()) &&
        /^[A-Za-z0-9]{8,14}$/.test((f[1] ?? "").trim()),
    )
    .map((f) => {
      const row: Record<string, string> = {};
      MARKET_WATCH_FIELDS.forEach((key, i) => {
        row[key] = (f[i] ?? "").trim();
      });
      return row as LiveMarketRow;
    });
}


export type LiveSymbolHit = {
  symbol: string;
  name: string;
  index: string;
  active: boolean;
};

/**
 * `search.aspx` — 10 comma fields per hit. Field 2 is the active index when
 * field 7 is `1`, otherwise it is that row's retired index.
 */
export function parseSearch(text: string): LiveSymbolHit[] {
  return rows(text)
    .filter((f) => (f[0] ?? "").trim() !== "")
    .map((f) => {
      const active = f[7]?.trim() === "1";
      return {
        symbol: (f[0] ?? "").trim(),
        name: (f[1] ?? "").trim(),
        index: (f[2] ?? "").trim(),
        active,
      };
    });
}

/** `GetInstrumentInfo` — the `instrumentInfo` object, flattened for display. */
export function parseInstrumentInfo(payload: unknown) {
  const info = (payload as { instrumentInfo?: Record<string, unknown> } | null)
    ?.instrumentInfo;
  if (!info || typeof info !== "object") return null;
  const s = (key: string) => String(info[key] ?? "");
  return {
    eps: n(s("eps")),
    sector: s("sector"),
    static_threshold: n(s("staticThreshold")),
    min_week: n(s("minWeek")),
    max_week: n(s("maxWeek")),
    min_year: n(s("minYear")),
    max_year: n(s("maxYear")),
    q_tot_tran5_j_avg: n(s("qTotTran5JAvg")),
    k_aj_cap_val_cps_idx: n(s("kAjCapValCpsIdx")),
    d_even: s("dEven"),
    top_inst: n(s("topInst")),
    fara_desc: s("faraDesc"),
    contract_size: n(s("contractSize")),
    nav: n(s("nav")),
    under_supervision: s("underSupervision"),
    l_val18: n(s("lVal18")),
    l_val30: n(s("lVal30")),
    l_val18_afc: n(s("lVal18AFC")),
    flow_title: s("flowTitle"),
    cgr_val_cot: n(s("cgrValCot")),
    cgr_val_cot_title: s("cgrValCotTitle"),
    c_com_val: n(s("cComVal")),
    c_soc_csac: n(s("cSocCSAC")),
    l_soc30: n(s("lSoc30")),
    y_mar_nsc: n(s("yMarNSC")),
    y_val: n(s("yVal")),
    ins_code: s("insCode"),
    c_isin: s("cIsin"),
    c_val_mne: n(s("cValMne")),
    z_titad: n(s("zTitad")),
    base_vol: n(s("baseVol")),
    instrument_id: s("instrumentID"),
    last_date: s("lastDate"),
  };
}

export type LiveShareholder = {
  date: string;
  id: string;
  name: string;
  isin: string;
  shares: number;
  percentage: number;
  change: number;
};

/**
 * `Shareholder` — the API returns today *and* tomorrow, and sometimes dates a
 * row one day later than asked, so upstream keeps only `dEven <= requested`.
 */
export function parseShareholders(
  payload: unknown,
  requested: string,
): LiveShareholder[] {
  const compact = requested.replace(/-/g, "");
  const list =
    (payload as { shareShareholder?: Record<string, unknown>[] } | null)
      ?.shareShareholder ?? [];
  return list
    .filter((h) => n(String(h.dEven ?? "0")) <= n(compact))
    .map((h) => ({
      date: isoDate(String(h.dEven ?? "")),
      id: String(h.shareHolderShareID ?? ""),
      name: String(h.shareHolderName ?? "").trim(),
      isin: String(h.cIsin ?? ""),
      shares: n(String(h.numberOfShares ?? "")),
      percentage: n(String(h.perOfShares ?? "")),
      change: n(String(h.change ?? "")),
    }));
}

export type LiveOrderBookLevel = {
  time: string;
  level: number;
  bid_price: number;
  bid_vol: number;
  bid_count: number;
  ask_price: number;
  ask_vol: number;
  ask_count: number;
};

/** `BestLimits` — one snapshot per row, newest first on the wire. */
export function parseBestLimits(payload: unknown, depth = 5): LiveOrderBookLevel[] {
  const list =
    (payload as { bestLimitsHistory?: Record<string, unknown>[] } | null)
      ?.bestLimitsHistory ?? [];
  return list
    .map((l) => ({
      time: clockTime(String(l.hEven ?? "")),
      level: n(String(l.number ?? "")),
      bid_price: n(String(l.pMeDem ?? "")),
      bid_vol: n(String(l.qTitMeDem ?? "")),
      bid_count: n(String(l.zOrdMeDem ?? "")),
      ask_price: n(String(l.pMeOf ?? "")),
      ask_vol: n(String(l.qTitMeOf ?? "")),
      ask_count: n(String(l.zOrdMeOf ?? "")),
    }))
    .filter((l) => l.level > 0 && l.level <= depth);
}

export type LiveTick = { date: string; volume: number; price: number };

/** `Trade/GetTradeHistory` — the tick tape, newest first on the wire. */
export function parseTrades(payload: unknown): LiveTick[] {
  const list =
    (payload as { tradeHistory?: Record<string, unknown>[] } | null)
      ?.tradeHistory ?? [];
  return list
    .map((t) => ({
      date: clockTime(String(t.hEven ?? "")),
      volume: n(String(t.qTitTran ?? "")),
      price: n(String(t.pTran ?? "")),
    }))
    .filter((t) => t.volume > 0);
}

/** Collapse a tick tape into fixed-width OHLCV buckets. */
export function aggregateTicks(ticks: LiveTick[], bucketSeconds: number) {
  const buckets = new Map<
    number,
    { time: number; open: number; high: number; low: number; close: number; volume: number }
  >();
  for (const tick of ticks) {
    const [h, m, s] = tick.date.split(":").map(Number);
    const secs = (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
    const start = Math.floor(secs / bucketSeconds) * bucketSeconds;
    const existing = buckets.get(start);
    if (!existing) {
      buckets.set(start, {
        time: start,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: tick.volume,
      });
    } else {
      existing.high = Math.max(existing.high, tick.price);
      existing.low = Math.min(existing.low, tick.price);
      existing.close = tick.price;
      existing.volume += tick.volume;
    }
  }
  return [...buckets.values()]
    .sort((a, b) => a.time - b.time)
    .map((b) => ({
      date: clockTime(String(b.time)),
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volume,
      price: b.close,
    }));
}
