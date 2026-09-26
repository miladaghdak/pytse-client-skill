import {
  aggregateTicks,
  bestLimits,
  board,
  clientTypes,
  history,
  instrumentInfo,
  marketWatch,
  resolveIndex,
  search,
  shareholders,
  shiftDays,
  totalShares,
  trades,
  LiveError,
} from "@/lib/live";
import type { LiveBoard, LiveMarketRow } from "@/lib/live-parse";
import type { InvokeResult } from "@/lib/invoke";
import { formatJdate } from "@/lib/jalali";
import { normalizeFa } from "@/lib/persian";

/**
 * The live half of the studio: the same 16 tools, answered by this server's
 * own calls to TSETMC. Turn the demo switch off and every tool lands here.
 *
 * Where the live exchange cannot answer exactly the way the Python client
 * does, the response says so in `hint` rather than quietly substituting
 * something else.
 */

const SOURCE = "live-tsetmc" as const;

const OK = (tool: string, data: unknown, hint?: string): InvokeResult => ({
  ok: true,
  tool,
  source: SOURCE,
  demo: false,
  data,
  ...(hint ? { hint } : {}),
});

const FAIL = (tool: string, error: string, hint?: string): InvokeResult => ({
  ok: false,
  tool,
  source: SOURCE,
  demo: false,
  error,
  ...(hint ? { hint } : {}),
});

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function num(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function flag(v: unknown): boolean {
  return v === true || v === "true";
}

/** Accepts `YYYY-MM-DD` or `YYYYMMDD`; returns `YYYY-MM-DD`. */
function iso(v: unknown): string | undefined {
  const raw = str(v);
  if (!raw) return undefined;
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined;
}

/** Every date from `start` back to `end`, newest first, capped. */
function eachDate(start: string, end: string, cap = 20): string[] {
  const out: string[] = [];
  let cursor = start;
  while (cursor >= end && out.length < cap) {
    out.push(cursor);
    const next = shiftDays(cursor, -1);
    if (next >= cursor) break;
    cursor = next;
  }
  return out;
}

/** Iran trades Sunday–Thursday, so Friday and Saturday are non-trading. */
function isWeekend(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 5 || day === 6;
}

const NO_ADJUST =
  "Raw TSETMC series: yesterday and adjClose are included, but pytse-client's cumulative capital-increase adjustment (adjust=True) is applied in Python on top and is not reproduced here. Use adjust=True in the Python package when computing returns across a split.";

async function rowsFor(input: Record<string, unknown>) {
  const symbol = str(input.symbol);
  if (!symbol) throw new LiveError("symbol is required");
  const index = str(input.index) ?? (await resolveIndex(symbol)).index;
  return { symbol, index };
}

function boardPayload(symbol: string, index: string, b: LiveBoard) {
  return {
    symbol,
    index,
    state: b.state,
    last_price: b.last_price,
    adj_close: b.adj_close,
    yesterday_price: b.yesterday_price,
    open_price: b.open_price,
    high_price: b.high_price,
    low_price: b.low_price,
    count: b.count,
    volume: b.volume,
    value: b.value,
    last_date: b.last_date,
    last_time: b.last_time,
    nav: b.nav,
    nav_date: b.nav_date,
    best_demand_price: b.buy_orders[0]?.price ?? 0,
    best_demand_vol: b.buy_orders[0]?.volume ?? 0,
    best_supply_price: b.sell_orders[0]?.price ?? 0,
    best_supply_vol: b.sell_orders[0]?.volume ?? 0,
    buy_orders: b.buy_orders,
    sell_orders: b.sell_orders,
    individual_trade_summary: b.individual_trade_summary,
    corporate_trade_summary: b.corporate_trade_summary,
  };
}

function statRow(r: LiveMarketRow) {
  return {
    symbol: r.symbol,
    name: r.name,
    index: r.index,
    last_price: num(r.last_price, 0),
    adj_closing_price: num(r.adj_closing_price, 0),
    min_price: num(r.min_price, 0),
    max_price: num(r.max_price, 0),
    yesterday_price: num(r.yesterday_price, 0),
    EPS: num(r.EPS, 0),
    base_volume: num(r.base_volume, 0),
    flow: r.flow,
    group_number: r.group_number,
    max_price_allowed: num(r.max_price_allowed, 0),
    min_price_allowed: num(r.min_price_allowed, 0),
    number_of_stocks: num(r.number_of_stocks, 0),
    volume_of_trans: num(r.volume_of_trans, 0),
    value_of_trans: num(r.value_of_trans, 0),
    number_of_trans: num(r.number_of_trans, 0),
    instrument_type: r.yval,
    last_trade_time: r.time,
  };
}

const TIMEFRAMES: Record<string, number> = {
  "30s": 30,
  "1m": 60,
  "5m": 300,
  "10m": 600,
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
};

export async function invokeLiveTool(
  toolName: string,
  input: unknown,
): Promise<InvokeResult> {
  const args = asRecord(input);

  try {
    switch (toolName) {
      case "all_symbols": {
        const rows = await marketWatch();
        return OK(toolName, {
          count: rows.length,
          symbols: rows.map((r) => r.symbol),
          note:
            "Live mode lists every instrument on today's TSETMC market board. The Python package's all_symbols() reads its own bundled symbols_name.json, which can lag new listings.",
        });
      }

      case "resolve_symbol": {
        const symbol = str(args.symbol);
        if (!symbol) return FAIL(toolName, "symbol is required");
        const hits = await search(symbol);
        const wanted = normalizeFa(symbol);
        const active = hits.find(
          (h) => h.active && normalizeFa(h.symbol) === wanted,
        );
        if (!active) {
          return FAIL(
            toolName,
            `Cannot find symbol: ${symbol}`,
            "Delisted names need Ticker('', index='…') in Python — pass index= here instead.",
          );
        }
        return OK(toolName, {
          symbol: active.symbol,
          name: active.name,
          index: active.index,
          old: hits.filter((h) => !h.active).map((h) => h.index),
        });
      }

      case "download_history": {
        const { symbol, index } = await rowsFor(args);
        const bars = await history(index);
        const includeJdate = flag(args.include_jdate);
        const limit = Math.min(Math.max(num(args.limit, 90), 1), 3000);
        // `Export-txt` arrives newest-first; upstream sorts ascending and the
        // demo engine does too, so emit the most recent `limit` days in
        // oldest-first order to match both. A plain `.slice(-limit)` on the
        // wire order would hand back the *oldest* rows instead.
        const rows = bars
          .slice(0, limit)
          .reverse()
          .map((b) => ({
            date: b.date,
            ...(includeJdate ? { jdate: formatJdate(b.date) } : {}),
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
            adjClose: b.adjClose,
            yesterday: b.yesterday,
            volume: b.volume,
            value: b.value,
            count: b.count,
          }));
        return OK(
          toolName,
          { symbol, index, count: rows.length, rows, adjusted: false },
          NO_ADJUST,
        );
      }

      case "download_client_types": {
        const { symbol, index } = await rowsFor(args);
        const rows = await clientTypes(index);
        return OK(toolName, {
          symbol,
          index,
          count: rows.length,
          rows: rows.slice(-30).reverse(),
        });
      }

      case "download_financial_indexes":
      case "financial_index_snapshot":
        // Verified against the live exchange: IndexFinancial.aspx,
        // chart/data/IndexFinancial.aspx, InitIndex.aspx and Index.aspx all
        // answer a financial index with the TSETMC site homepage, while
        // Export-txt.aspx and instinfofast.aspx answer empty for an index code.
        // There is no series to fetch, so say that rather than fail obscurely.
        return FAIL(
          toolName,
          "TSETMC no longer serves a financial-index series over HTTP",
          "Every index endpoint answers with the site homepage or an empty body, and the market board carries no index rows. Use the Python package for index history, or switch demo mode on for the seeded شاخص کل line.",
        );

      case "ticker_snapshot": {
        const { symbol, index } = await rowsFor(args);
        const [info, b] = await Promise.all([
          instrumentInfo(index),
          board(index),
        ]);
        return OK(toolName, {
          ...boardPayload(symbol, index, b),
          title: info.fara_desc,
          sector: info.sector,
          isin: info.c_isin,
          flow: info.flow_title,
          url: `https://old.tsetmc.com/tsev2/panel/instInfo.aspx?i=${index}`,
          eps: info.eps,
          p_e_ratio:
            info.eps > 0
              ? Math.round((b.last_price / info.eps) * 100) / 100
              : null,
          nav: info.nav,
          static_threshold: info.static_threshold,
          min_week: info.min_week,
          max_week: info.max_week,
          min_year: info.min_year,
          max_year: info.max_year,
          base_volume: info.base_vol,
          total_shares: info.z_titad,
          contract_size: info.contract_size,
          instrument_type: info.y_val,
          sector_pe: info.c_soc_csac || null,
          market_cap: b.last_price * info.z_titad,
        });
      }

      case "ticker_realtime": {
        const { symbol, index } = await rowsFor(args);
        const b = await board(index);
        const halted = b.state.includes("متوقف") || b.state.includes("ممنوع");
        return OK(
          toolName,
          { ...boardPayload(symbol, index, b), fetched_at: new Date().toISOString() },
          halted
            ? `Instrument state is "${b.state}" — this is the last session's close, not a live quote.`
            : undefined,
        );
      }

      case "ticker_shareholders": {
        const { symbol, index } = await rowsFor(args);
        const b = await board(index);
        const holders = await shareholders(index, b.last_date);
        const sum = holders.reduce((a, h) => a + h.percentage, 0);
        return OK(toolName, {
          symbol,
          index,
          as_of: b.last_date,
          shareholders: holders,
          major_holder_pct: Math.round(sum * 100) / 100,
          implied_float: Math.round((100 - sum) * 100) / 100,
        });
      }

      case "ticker_shareholders_history": {
        const { symbol, index } = await rowsFor(args);
        const b = await board(index);
        const days = Math.min(Math.max(num(args.days, 14), 1), 20);
        const dates = eachDate(
          b.last_date,
          shiftDays(b.last_date, -(days - 1)),
        ).filter((d) => !isWeekend(d));
        // Serial on purpose: TSETMC bans the IP when these are parallelised.
        const rows: unknown[] = [];
        for (const date of dates) {
          try {
            for (const h of await shareholders(index, date)) {
              // `h.date` is the sheet's own date, which can be a day earlier
              // than the one we asked for; keep both so the gap is visible.
              rows.push({ ...h, requested: date });
            }
          } catch {
            // A day with no published table is skipped, as upstream does.
          }
        }
        return OK(
          toolName,
          { symbol, index, days, count: rows.length, rows },
          "Fetched serially on purpose — TSETMC rate-limits, and eventually bans, clients that request shareholder history in parallel.",
        );
      }

      case "ticker_trade_details": {
        const { symbol, index } = await rowsFor(args);
        const b = await board(index);
        const ticks = await trades(index, b.last_date);
        return OK(
          toolName,
          {
            symbol,
            index,
            session: b.last_date,
            count: ticks.length,
            rows: ticks,
          },
          "TSETMC stores the tape newest-first; the rows above are in that wire order.",
        );
      }

      case "get_trade_details": {
        const { symbol, index } = await rowsFor(args);
        const start = iso(args.start_date);
        if (!start) return FAIL(toolName, "symbol and start_date are required");
        const end = iso(args.end_date) ?? start;
        const timeframe = str(args.timeframe);
        const bucket = timeframe ? TIMEFRAMES[timeframe] : undefined;
        if (timeframe && !bucket) {
          return FAIL(
            toolName,
            `Unsupported timeframe: ${timeframe}`,
            `Valid: ${Object.keys(TIMEFRAMES).join(", ")}`,
          );
        }
        const days = eachDate(start, end, 20).filter((d) => !isWeekend(d));
        const byDay: Record<string, unknown> = {};
        let total = 0;
        for (const date of days) {
          try {
            const ticks = await trades(index, date);
            total += ticks.length;
            byDay[date] = bucket ? aggregateTicks(ticks, bucket) : ticks;
          } catch {
            // Non-trading day, or no tape published — skip it.
          }
        }
        return OK(toolName, {
          symbol,
          index,
          start_date: start,
          end_date: end,
          timeframe: timeframe ?? null,
          aggregate: flag(args.aggregate),
          total_ticks: total,
          data: flag(args.aggregate) ? Object.values(byDay).flat() : byDay,
        });
      }

      case "get_orderbook": {
        const { symbol, index } = await rowsFor(args);
        const start = iso(args.start_date);
        if (!start) return FAIL(toolName, "symbol and start_date are required");
        const end = iso(args.end_date) ?? start;
        const days = eachDate(start, end, 10).filter((d) => !isWeekend(d));
        const byDay: Record<string, unknown> = {};
        for (const date of days) {
          try {
            byDay[date] = await bestLimits(index, date, 5);
          } catch {
            // No book published for that session.
          }
        }
        return OK(
          toolName,
          {
            symbol,
            index,
            start_date: start,
            end_date: end,
            diff_orderbook: flag(args.diff_orderbook),
            depth: 5,
            days: byDay,
          },
          "diff_orderbook is accepted and ignored: TSETMC already sends only changed rows, so a diff is all there is to fetch.",
        );
      }

      case "get_asks_and_bids": {
        const rows = await marketWatch();
        return OK(
          toolName,
          {
            count: rows.length,
            rows: rows.map((r, i) => ({
              id: r.index,
              row_number: i + 1,
              symbol: r.symbol,
              name: r.name,
              buy_price: num(r.adj_closing_price, 0),
              sell_price: num(r.adj_closing_price, 0),
              buy_volume: num(r.base_volume, 0),
              sell_volume: 0,
              number_of_buyers: 0,
              num_of_sellers: 0,
            })),
          },
          "MarketWatchInit publishes one closing snapshot per instrument with no per-level depth. For a real five-level book on one symbol use get_orderbook.",
        );
      }

      case "get_stats": {
        const rows = await marketWatch();
        return OK(
          toolName,
          { count: rows.length, rows: rows.map(statRow) },
          "Live stats come from the TSETMC market board (MarketWatchInit). The client-type columns in the Python get_stats() cost one extra request per symbol — use download_client_types for حقیقی/حقوقی flow.",
        );
      }

      case "ticker_total_shares_history": {
        const { symbol, index } = await rowsFor(args);
        const b = await board(index);
        const days = Math.min(Math.max(num(args.days, 60), 1), 20);
        const dates = eachDate(
          b.last_date,
          shiftDays(b.last_date, -(days - 1)),
        ).filter((d) => !isWeekend(d));
        const rows: unknown[] = [];
        for (const date of dates) {
          try {
            const share = await totalShares(index, date);
            rows.push({
              date,
              jdate: formatJdate(date),
              total_shares: share.total_shares,
              base_vol: share.base_vol,
            });
          } catch {
            // No share-count record for that day.
          }
        }
        return OK(
          toolName,
          { symbol, index, days, count: rows.length, rows },
          "One request per trading day, fetched serially. Sample a wider window with the Python package rather than from here.",
        );
      }

      default:
        return FAIL(
          toolName,
          "Tool not available in live mode",
          "Turn the demo switch on to exercise this tool against the synthetic corpus.",
        );
    }
  } catch (err) {
    return FAIL(
      toolName,
      err instanceof Error ? err.message : "live fetch failed",
      err instanceof LiveError
        ? "TSETMC did not answer. Retry — the exchange is often slow outside market hours — or turn the demo switch on for the synthetic corpus."
        : undefined,
    );
  }
}
