import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  clientTypeDays,
  financialIndexes,
  indexBars,
  shareholders,
  tickerBars,
  tickers,
} from "@/db/schema";
import { TOOLS } from "@/lib/catalog";
import { INDEX_SEEDS, INSTRUMENTS } from "@/lib/instruments";
import { formatJdate } from "@/lib/jalali";
import { normalizeFa } from "@/lib/persian";
import { hashString, mulberry32 } from "@/lib/rng";

export type InvokeResult = {
  ok: boolean;
  tool: string;
  source: "skill-studio-demo";
  demo: true;
  data?: unknown;
  error?: string;
  hint?: string;
};

function asRecord(input: unknown): Record<string, unknown> {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return input as Record<string, unknown>;
  }
  return {};
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function bool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}

function num(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

async function findTicker(symbolRaw: string) {
  const symbol = normalizeFa(symbolRaw);
  const rows = await db.select().from(tickers);
  const hit = rows.find((t) => normalizeFa(t.symbol) === symbol);
  return hit ?? null;
}

async function findIndex(symbolRaw: string) {
  const symbol = normalizeFa(symbolRaw);
  const rows = await db.select().from(financialIndexes);
  return rows.find((t) => normalizeFa(t.symbol) === symbol) ?? null;
}

function tradesFor(last: number, volume: number, seed: string) {
  const rand = mulberry32(hashString(`ticks:${seed}`));
  const rows = [];
  let remaining = volume;
  let hour = 9;
  let minute = 0;
  let second = 20;
  let price = last * 0.992;
  const n = 48;
  for (let i = 0; i < n; i += 1) {
    const vol = Math.max(1, Math.round((remaining / (n - i)) * (0.4 + rand())));
    remaining -= vol;
    price = Math.max(1, price * (1 + (rand() - 0.48) * 0.004));
    second += 20 + Math.floor(rand() * 80);
    if (second >= 60) {
      minute += Math.floor(second / 60);
      second %= 60;
    }
    if (minute >= 60) {
      hour += Math.floor(minute / 60);
      minute %= 60;
    }
    if (hour >= 12 && minute > 29) {
      hour = 12;
      minute = 29;
    }
    rows.push({
      date: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`,
      volume: vol,
      price: Math.round(price * 10) / 10,
    });
  }
  rows[rows.length - 1].price = last;
  return rows;
}

export async function invokeTool(
  toolName: string,
  input: unknown,
): Promise<InvokeResult> {
  const tool = TOOLS.find((t) => t.name === toolName);
  if (!tool) {
    return {
      ok: false,
      tool: toolName,
      source: "skill-studio-demo", demo: true,
      error: `Unknown tool: ${toolName}`,
      hint: `Valid tools: ${TOOLS.map((t) => t.name).join(", ")}`,
    };
  }

  const args = asRecord(input);

  try {
    switch (toolName) {
      case "all_symbols": {
        const rows = await db.select({ symbol: tickers.symbol }).from(tickers);
        return {
          ok: true,
          tool: toolName,
          source: "skill-studio-demo", demo: true,
          data: {
            count: rows.length,
            symbols: rows.map((r) => r.symbol),
            note: "Studio corpus is a curated subset. Upstream all_symbols() returns the full TSE universe from symbols_name.json.",
          },
        };
      }
      case "resolve_symbol": {
        const symbol = str(args.symbol);
        if (!symbol) {
          return { ok: false, tool: toolName, source: "skill-studio-demo", demo: true, error: "symbol is required" };
        }
        const row = await findTicker(symbol);
        if (!row) {
          return {
            ok: false,
            tool: toolName,
            source: "skill-studio-demo", demo: true,
            error: `Cannot find symbol: ${symbol}`,
            hint: "Delisted names need Ticker('', index='…'). Normalize ي/ک first.",
          };
        }
        return {
          ok: true,
          tool: toolName,
          source: "skill-studio-demo", demo: true,
          data: {
            symbol: row.symbol,
            index: row.indexCode,
            name: row.title,
            isin: row.isin,
            flow: row.flow,
            old: [],
          },
        };
      }
      case "download_history": {
        const symbol = str(args.symbol);
        if (!symbol) {
          return { ok: false, tool: toolName, source: "skill-studio-demo", demo: true, error: "symbol is required" };
        }
        const row = await findTicker(symbol);
        if (!row) {
          return { ok: false, tool: toolName, source: "skill-studio-demo", demo: true, error: `Cannot find symbol: ${symbol}` };
        }
        const limit = num(args.limit, 90);
        const bars = await db
          .select()
          .from(tickerBars)
          .where(eq(tickerBars.tickerId, row.id))
          .orderBy(desc(tickerBars.date))
          .limit(Math.min(Math.max(limit, 1), 90));
        const includeJdate = bool(args.include_jdate, false);
        const data = bars.reverse().map((b) => ({
          date: b.date,
          ...(includeJdate ? { jdate: b.jdate } : {}),
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
          adjClose: bool(args.adjust, false) ? b.adjClose : b.close,
          yesterday: b.yesterday,
          volume: b.volume,
          count: b.count,
          value: b.value,
        }));
        return { ok: true, tool: toolName, source: "skill-studio-demo", demo: true, data: { symbol: row.symbol, rows: data } };
      }
      case "download_client_types": {
        const symbol = str(args.symbol);
        if (!symbol) {
          return { ok: false, tool: toolName, source: "skill-studio-demo", demo: true, error: "symbol is required" };
        }
        const row = await findTicker(symbol);
        if (!row) {
          return { ok: false, tool: toolName, source: "skill-studio-demo", demo: true, error: `Cannot find symbol: ${symbol}` };
        }
        const days = await db
          .select()
          .from(clientTypeDays)
          .where(eq(clientTypeDays.tickerId, row.id))
          .orderBy(desc(clientTypeDays.date))
          .limit(30);
        return {
          ok: true,
          tool: toolName,
          source: "skill-studio-demo", demo: true,
          data: { symbol: row.symbol, rows: days.reverse() },
        };
      }
      case "download_financial_indexes":
      case "financial_index_snapshot": {
        const symbol = str(args.symbol) ?? "شاخص کل";
        const row = await findIndex(symbol);
        if (!row) {
          return {
            ok: false,
            tool: toolName,
            source: "skill-studio-demo", demo: true,
            error: `Cannot find financial index: ${symbol}`,
            hint: `Known: ${INDEX_SEEDS.map((i) => i.symbol).join(", ")}`,
          };
        }
        const bars = await db
          .select()
          .from(indexBars)
          .where(eq(indexBars.indexId, row.id))
          .orderBy(indexBars.date);
        return {
          ok: true,
          tool: toolName,
          source: "skill-studio-demo", demo: true,
          data: {
            symbol: row.symbol,
            index: row.indexCode,
            last_value: row.lastValue,
            last_update: row.lastUpdate,
            high: row.high,
            low: row.low,
            history: bars,
          },
        };
      }
      case "ticker_snapshot": {
        const symbol = str(args.symbol);
        if (!symbol) {
          return { ok: false, tool: toolName, source: "skill-studio-demo", demo: true, error: "symbol is required" };
        }
        const row = await findTicker(symbol);
        if (!row) {
          return { ok: false, tool: toolName, source: "skill-studio-demo", demo: true, error: `Cannot find symbol: ${symbol}` };
        }
        return {
          ok: true,
          tool: toolName,
          source: "skill-studio-demo", demo: true,
          data: {
            symbol: row.symbol,
            index: row.indexCode,
            title: row.title,
            url: row.tsetmcUrl,
            group_name: row.groupName,
            fiscal_year: row.fiscalYear,
            eps: row.eps,
            p_e_ratio: row.peRatio,
            group_p_e_ratio: row.groupPeRatio,
            nav: row.nav,
            nav_date: row.navDate,
            psr: row.psr,
            p_s_ratio: row.psRatio,
            base_volume: row.baseVolume,
            state: row.state,
            last_price: row.lastPrice,
            adj_close: row.adjClose,
            yesterday_price: row.yesterdayPrice,
            open_price: row.openPrice,
            high_price: row.highPrice,
            low_price: row.lowPrice,
            count: row.tradeCount,
            volume: row.volume,
            value: row.value,
            last_date: row.lastDate,
            flow: row.flow,
            sta_max: row.staMax,
            sta_min: row.staMin,
            min_week: row.minWeek,
            max_week: row.maxWeek,
            min_year: row.minYear,
            max_year: row.maxYear,
            month_average_volume: row.monthAverageVolume,
            float_shares: row.floatShares,
            total_shares: row.totalShares,
            market_cap: row.marketCap,
            best_supply_price: row.bestSupplyPrice,
            best_supply_vol: row.bestSupplyVol,
            best_demand_price: row.bestDemandPrice,
            best_demand_vol: row.bestDemandVol,
          },
        };
      }
      case "get_asks_and_bids": {
        // Upstream takes no symbol parameter — a market-wide top-of-book
        // snapshot from MarketWatchInit, filtered to bundled symbols.
        const rows = await db.select().from(tickers).orderBy(tickers.id);
        const board = rows.map((r, i) => {
          const buy = (r.buyOrders as Array<{ count: number }>)[0];
          const sell = (r.sellOrders as Array<{ count: number }>)[0];
          return {
            id: r.indexCode,
            row_number: i + 1,
            num_of_sellers: sell?.count ?? 0,
            number_of_buyers: buy?.count ?? 0,
            buy_price: r.bestDemandPrice,
            sell_price: r.bestSupplyPrice,
            buy_volume: r.bestDemandVol,
            sell_volume: r.bestSupplyVol,
            symbol: r.symbol,
          };
        });
        return {
          ok: true,
          tool: toolName,
          source: "skill-studio-demo", demo: true,
          data: { count: board.length, rows: board },
        };
      }
      case "ticker_realtime": {
        const symbol = str(args.symbol);
        if (!symbol) {
          return { ok: false, tool: toolName, source: "skill-studio-demo", demo: true, error: "symbol is required" };
        }
        const row = await findTicker(symbol);
        if (!row) {
          return { ok: false, tool: toolName, source: "skill-studio-demo", demo: true, error: `Cannot find symbol: ${symbol}` };
        }
        if (row.state.includes("ممنوع") || row.state.includes("متوقف")) {
          return {
            ok: false,
            tool: toolName,
            source: "skill-studio-demo", demo: true,
            error: "cannot get realtime data",
            hint: "The demo corpus models halted states as errors. Upstream raises RuntimeError only for deactivated/delisted symbols (index in old[]) — halted symbols still return a board via state.",
          };
        }
        return {
          ok: true,
          tool: toolName,
          source: "skill-studio-demo", demo: true,
          data: {
            symbol: row.symbol,
            state: row.state,
            last_price: row.lastPrice,
            adj_close: row.adjClose,
            yesterday_price: row.yesterdayPrice,
            open_price: row.openPrice,
            high_price: row.highPrice,
            low_price: row.lowPrice,
            count: row.tradeCount,
            volume: row.volume,
            value: row.value,
            last_date: row.lastDate,
            best_supply_price: row.bestSupplyPrice,
            best_supply_vol: row.bestSupplyVol,
            best_demand_price: row.bestDemandPrice,
            best_demand_vol: row.bestDemandVol,
            buy_orders: row.buyOrders,
            sell_orders: row.sellOrders,
            individual_trade_summary: {
              buy_count: row.individualBuyCount,
              buy_vol: row.individualBuyVol,
              sell_count: row.individualSellCount,
              sell_vol: row.individualSellVol,
            },
            corporate_trade_summary: {
              buy_count: row.corporateBuyCount,
              buy_vol: row.corporateBuyVol,
              sell_count: row.corporateSellCount,
              sell_vol: row.corporateSellVol,
            },
            nav: row.nav,
            nav_date: row.navDate,
            market_cap: row.marketCap,
          },
        };
      }
      case "ticker_shareholders": {
        const symbol = str(args.symbol);
        if (!symbol) {
          return { ok: false, tool: toolName, source: "skill-studio-demo", demo: true, error: "symbol is required" };
        }
        const row = await findTicker(symbol);
        if (!row) {
          return { ok: false, tool: toolName, source: "skill-studio-demo", demo: true, error: `Cannot find symbol: ${symbol}` };
        }
        const holders = await db
          .select()
          .from(shareholders)
          .where(eq(shareholders.tickerId, row.id));
        const sum = holders.reduce((a, h) => a + h.percentage, 0);
        return {
          ok: true,
          tool: toolName,
          source: "skill-studio-demo", demo: true,
          data: {
            symbol: row.symbol,
            shareholders: holders,
            major_holder_pct: sum,
            implied_float: Math.round((100 - sum) * 100) / 100,
            reported_float_shares: row.floatShares,
          },
        };
      }
      case "ticker_shareholders_history": {
        const symbol = str(args.symbol);
        if (!symbol) {
          return { ok: false, tool: toolName, source: "skill-studio-demo", demo: true, error: "symbol is required" };
        }
        const row = await findTicker(symbol);
        if (!row) {
          return { ok: false, tool: toolName, source: "skill-studio-demo", demo: true, error: `Cannot find symbol: ${symbol}` };
        }
        const holders = await db
          .select()
          .from(shareholders)
          .where(eq(shareholders.tickerId, row.id));
        const days = num(args.days, 14);
        const bars = await db
          .select({ date: tickerBars.date })
          .from(tickerBars)
          .where(eq(tickerBars.tickerId, row.id))
          .orderBy(desc(tickerBars.date))
          .limit(Math.min(days, 30));
        const history = bars.reverse().flatMap((b) =>
          holders.map((h) => ({
            date: b.date,
            shareholder_id: h.shareholderId,
            shareholder_shares: h.shares,
            shareholder_percentage: h.percentage,
            shareholder_instrument_id: row.isin,
            shareholder_name: h.name,
            change: h.change,
          })),
        );
        return {
          ok: true,
          tool: toolName,
          source: "skill-studio-demo", demo: true,
          data: {
            symbol: row.symbol,
            warning:
              "Upstream call is slow. Do not parallelise across symbols — TSETMC will ban the IP. Use get_shareholders_history_async inside a running loop.",
            rows: history,
          },
        };
      }
      case "ticker_trade_details": {
        const symbol = str(args.symbol);
        if (!symbol) {
          return { ok: false, tool: toolName, source: "skill-studio-demo", demo: true, error: "symbol is required" };
        }
        const row = await findTicker(symbol);
        if (!row) {
          return { ok: false, tool: toolName, source: "skill-studio-demo", demo: true, error: `Cannot find symbol: ${symbol}` };
        }
        return {
          ok: true,
          tool: toolName,
          source: "skill-studio-demo", demo: true,
          data: {
            symbol: row.symbol,
            session: row.lastDate,
            rows: tradesFor(row.lastPrice, row.volume, row.symbol),
          },
        };
      }
      case "get_trade_details": {
        const symbol = str(args.symbol);
        const start = str(args.start_date);
        if (!symbol || !start) {
          return {
            ok: false,
            tool: toolName,
            source: "skill-studio-demo", demo: true,
            error: "symbol and start_date are required",
          };
        }
        const row = await findTicker(symbol);
        if (!row) {
          return { ok: false, tool: toolName, source: "skill-studio-demo", demo: true, error: `Cannot find symbol: ${symbol}` };
        }
        const end = str(args.end_date) ?? start;
        const timeframe = str(args.timeframe) ?? null;
        return {
          ok: true,
          tool: toolName,
          source: "skill-studio-demo", demo: true,
          data: {
            symbol: row.symbol,
            start_date: start,
            end_date: end,
            timeframe,
            aggregate: bool(args.aggregate, false),
            rows: tradesFor(row.lastPrice, row.volume, `${row.symbol}:${start}`),
          },
        };
      }
      case "get_orderbook": {
        const symbol = str(args.symbol);
        const start = str(args.start_date);
        if (!symbol || !start) {
          return {
            ok: false,
            tool: toolName,
            source: "skill-studio-demo", demo: true,
            error: "symbol and start_date are required",
          };
        }
        const row = await findTicker(symbol);
        if (!row) {
          return { ok: false, tool: toolName, source: "skill-studio-demo", demo: true, error: `Cannot find symbol: ${symbol}` };
        }
        const end = str(args.end_date) ?? start;
        const bars = await db
          .select()
          .from(tickerBars)
          .where(
            and(
              eq(tickerBars.tickerId, row.id),
              gte(tickerBars.date, start),
              lte(tickerBars.date, end),
            ),
          )
          .orderBy(tickerBars.date)
          .limit(10);
        const byDay: Record<string, unknown> = {};
        for (const b of bars) {
          const rand = mulberry32(hashString(`ob:${row.symbol}:${b.date}`));
          const levels = [];
          for (let i = 0; i < 5; i += 1) {
            const step = Math.max(1, Math.round(b.close * 0.0015 * (i + 1)));
            levels.push({
              time: "09:00:12",
              bid_price: b.close - step,
              bid_vol: Math.round(10_000 + rand() * 90_000),
              ask_price: b.close + step,
              ask_vol: Math.round(10_000 + rand() * 90_000),
              level: i + 1,
            });
          }
          byDay[String(b.date)] = levels;
        }
        return {
          ok: true,
          tool: toolName,
          source: "skill-studio-demo", demo: true,
          data: {
            symbol: row.symbol,
            start_date: start,
            end_date: end,
            diff_orderbook: bool(args.diff_orderbook, false),
            days: byDay,
          },
        };
      }
      case "get_stats": {
        const rows = await db.select().from(tickers);
        const stats = rows.map((r) => ({
          symbol: r.symbol,
          name: r.title,
          index: r.indexCode,
          last_price: r.lastPrice,
          adj_closing_price: r.adjClose,
          open_price: r.openPrice,
          min_price: r.lowPrice,
          max_price: r.highPrice,
          yesterday_price: r.yesterdayPrice,
          EPS: r.eps,
          base_volume: r.baseVolume,
          group_number: r.groupNumber,
          max_price_allowed: r.staMax,
          min_price_allowed: r.staMin,
          number_of_stocks: r.totalShares,
          volume_of_trans: r.volume,
          value_of_trans: r.value,
          number_of_trans: r.tradeCount,
          flow: r.flowCode,
          float_shares: r.floatShares,
          ave_numof_buyer_last_3_month: Math.round(r.individualBuyCount * 0.4),
          ave_numof_buyer_last_12_month: Math.round(r.individualBuyCount * 0.7),
          numof_individual_buy: r.individualBuyCount,
          numof_corporate_buy: r.corporateBuyCount,
          vol_individual_buy: r.individualBuyVol,
          vol_corporate_buy: r.corporateBuyVol,
          numof_individual_sell: r.individualSellCount,
          numof_corporate_sell: r.corporateSellCount,
          vol_individual_sell: r.individualSellVol,
          vol_corporate_sell: r.corporateSellVol,
        }));
        return { ok: true, tool: toolName, source: "skill-studio-demo", demo: true, data: { rows: stats } };
      }
      case "ticker_total_shares_history": {
        const symbol = str(args.symbol);
        if (!symbol) {
          return { ok: false, tool: toolName, source: "skill-studio-demo", demo: true, error: "symbol is required" };
        }
        const row = await findTicker(symbol);
        if (!row) {
          return { ok: false, tool: toolName, source: "skill-studio-demo", demo: true, error: `Cannot find symbol: ${symbol}` };
        }
        const days = num(args.days, 60);
        const bars = await db
          .select({ date: tickerBars.date })
          .from(tickerBars)
          .where(eq(tickerBars.tickerId, row.id))
          .orderBy(desc(tickerBars.date))
          .limit(Math.min(days, 90));
        return {
          ok: true,
          tool: toolName,
          source: "skill-studio-demo", demo: true,
          data: {
            symbol: row.symbol,
            note: "Await get_total_shares_history_async. Do not asyncio.run() inside a running loop.",
            rows: bars.reverse().map((b) => ({
              date: b.date,
              jdate: formatJdate(String(b.date)),
              total_shares: row.totalShares,
            })),
          },
        };
      }
      default:
        return { ok: false, tool: toolName, source: "skill-studio-demo", demo: true, error: "Tool not implemented" };
    }
  } catch (err) {
    return {
      ok: false,
      tool: toolName,
      source: "skill-studio-demo", demo: true,
      error: err instanceof Error ? err.message : "invoke failed",
    };
  }
}

export const STUDIO_UNIVERSE = INSTRUMENTS.map((i) => i.symbol);
