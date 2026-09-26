import { pctChange } from "@/lib/format";
import { INSTRUMENTS } from "@/lib/instruments";
import {
  board,
  clientTypes,
  history,
  marketWatch,
  resolveIndex,
  shareholders,
} from "@/lib/live";
import type {
  LiveBar,
  LiveBoard,
  LiveShareholder,
} from "@/lib/live-parse";
import { normalizeFa } from "@/lib/persian";

/**
 * Page-shaped views over the live TSETMC layer.
 *
 * `live.ts` speaks TSETMC and `live-invoke.ts` answers the 16 tools; server
 * components need something in between — the same rows the synthetic corpus
 * yields, but real, so one page layout serves both modes.
 *
 * Every function returns a `reason` instead of throwing. A page renders
 * `LiveFallback` with it, which is why no live fetch can take a route down.
 */

export type LiveQuote = {
  /** The studio's own Persian spelling, so links and copy stay consistent. */
  symbol: string;
  /** TSETMC's own name field — Arabic kaf, as the exchange returns it. */
  name: string;
  /** Only the corpus carries a group label; MarketWatchInit has a number. */
  groupName: string;
  index: string;
  last: number;
  yesterday: number;
  changePct: number;
  high: number;
  low: number;
  adjClose: number;
  volume: number;
  value: number;
  count: number;
  eps: number | null;
  /** TSETMC publishes EPS but no ratio; the division is ours to make. */
  peRatio: number | null;
};

export type LiveList = {
  quotes: LiveQuote[];
  /** How many instruments TSETMC's live board carries in total. */
  boardSize: number;
  reason: string | null;
};

export type LiveFlowDay = Awaited<ReturnType<typeof clientTypes>>[number];

export type LiveTicker = {
  symbol: string;
  index: string;
  board: LiveBoard;
  bars: LiveBar[];
  flow: LiveFlowDay[];
  holders: LiveShareholder[];
  /** The MarketWatchInit row for this symbol — EPS, base volume, market state. */
  quote: LiveQuote | null;
  /** One line per panel that could not be reached, keyed by panel id. */
  reasons: Record<string, string>;
};

function reasonOf(err: unknown): string {
  return err instanceof Error ? err.message : "unknown error";
}

function num(raw: string | undefined): number {
  const value = Number(String(raw ?? "").replace(/,/g, ""));
  return Number.isFinite(value) ? value : 0;
}

/**
 * The studio's names, priced by the exchange.
 *
 * `MarketWatchInit` answers the whole board in one request, so the twelve names
 * the corpus knows about come back for free — no per-symbol board call, which
 * keeps the homepage and the universe table at a single upstream fetch.
 */
export async function liveQuotes(): Promise<LiveList> {
  let rows;
  try {
    rows = await marketWatch();
  } catch (err) {
    return { quotes: [], boardSize: 0, reason: reasonOf(err) };
  }

  const byIndex = new Map(rows.map((r) => [r.index, r]));
  const quotes: LiveQuote[] = [];
  for (const seed of INSTRUMENTS) {
    const row = byIndex.get(seed.indexCode);
    if (!row) continue;
    const last = num(row.last_price);
    const eps = num(row.EPS) || null;
    quotes.push({
      symbol: seed.symbol,
      name: row.name || seed.title,
      groupName: seed.groupName,
      index: seed.indexCode,
      last,
      yesterday: num(row.yesterday_price),
      changePct: pctChange(last, num(row.yesterday_price)),
      // The board has no open column; field 5 repeats the session high.
      high: num(row.high_price) || num(row.max_price),
      low: num(row.min_price),
      adjClose: num(row.adj_closing_price),
      volume: num(row.volume_of_trans),
      value: num(row.value_of_trans),
      count: num(row.number_of_trans),
      eps,
      peRatio: eps ? last / eps : null,
    });
  }

  return { quotes, boardSize: rows.length, reason: null };
}

/**
 * One symbol in full: the realtime board, daily candles, the published
 * حقیقی/حقوقی flow, and the latest shareholder sheet.
 *
 * Fetches run one after another. TSETMC bans the IP for parallel bursts on
 * these endpoints, and `live.ts` caches each for minutes, so a second visit to
 * the same page costs nothing.
 */
export async function liveTicker(symbolRaw: string): Promise<LiveTicker | { reason: string }> {
  const wanted = normalizeFa(symbolRaw);
  const seed = INSTRUMENTS.find((i) => normalizeFa(i.symbol) === wanted);
  const index = seed?.indexCode ?? (await resolveIndex(symbolRaw)).index;
  const symbol = seed?.symbol ?? symbolRaw;

  let realtime: LiveBoard;
  try {
    realtime = await board(index);
  } catch (err) {
    return { reason: reasonOf(err) };
  }

  /** One panel failing must not blank the other three. */
  const settled = async <T>(id: string, load: () => Promise<T>, fallback: T) => {
    const reasons: Record<string, string> = {};
    try {
      return { value: await load(), reasons };
    } catch (err) {
      reasons[id] = reasonOf(err);
      return { value: fallback, reasons };
    }
  };

  const bars = await settled("bars", () => history(index), [] as LiveBar[]);
  const flow = await settled("flow", () => clientTypes(index), [] as LiveFlowDay[]);
  const day = realtime.last_date || new Date().toISOString().slice(0, 10);
  const holders = await settled("holders", () => shareholders(index, day), [] as LiveShareholder[]);
  // MarketWatchInit is cached for minutes and the homepage usually warms it,
  // so this is usually free — and it is the only endpoint carrying EPS.
  const quote = await settled("quote", () => liveQuotes(), null as LiveList | null);

  return {
    symbol,
    index,
    board: realtime,
    bars: bars.value,
    flow: flow.value,
    holders: holders.value,
    quote: quote.value?.quotes.find((q) => q.index === index) ?? null,
    reasons: { ...bars.reasons, ...flow.reasons, ...holders.reasons, ...quote.reasons },
  };
}
