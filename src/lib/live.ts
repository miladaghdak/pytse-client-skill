import {
  aggregateTicks,
  parseBestLimits,
  parseBoard,
  parseClientTypes,
  parseHistoryCsv,
  parseInstrumentInfo,
  parseMarketWatch,
  parseSearch,
  parseShareholders,
  parseTrades,
  type LiveBar,
  type LiveBoard,
  type LiveOrderBookLevel,
  type LiveShareholder,
  type LiveSymbolHit,
  type LiveTick,
} from "@/lib/live-parse";
import { normalizeFa } from "@/lib/persian";

/**
 * The live TSETMC layer.
 *
 * This is what "demo off" means: the Next.js server itself talks to
 * old.tsetmc.com and cdn.tsetmc.com, using the same URLs and the same parsing
 * that pytse-client v0.19.1 uses. A visitor of the Web UI installs nothing.
 *
 * Two things the upstream Python client does that this deliberately does not:
 *  - it sends no `ASP.NET_SessionId`. Upstream hardcodes a scraped session
 *    cookie; every endpoint below answers a plain UA + Accept just fine, and
 *    shipping a session token in a public repo is not worth it.
 *  - it never parallelises shareholder/orderbook requests, because TSETMC bans
 *    the IP. Callers here go through the TTL cache below for the same reason.
 */

const OLD = "https://old.tsetmc.com/tsev2/data";
const CDN = "https://cdn.tsetmc.com/api";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
/** Upstream sends an Android Chrome string specifically for the order book. */
const ORDERBOOK_UA =
  "Mozilla/5.0 (Linux; Android 10; SM-A505F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

const FETCH_TIMEOUT_MS = 9000;
/** MarketWatchInit is the whole board in one body — ~1.3 MB — so it needs more. */
const BIG_FETCH_TIMEOUT_MS = 25_000;

export class LiveError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "LiveError";
    this.status = status;
  }
}

async function get(
  url: string,
  ua = BROWSER_UA,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": ua, Accept: "text/html,application/json,*/*" },
      cache: "no-store",
      // `chart/data/IndexFinancial.aspx` answers a 302 before the payload, so
      // following is required. Every host here is a literal constant, so a
      // redirect cannot be steered anywhere we did not already ask for.
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    // `fetch` collapses every transport failure to "fetch failed"; the `cause`
    // is the only place the real reason lives, and a page that says
    // "unreachable (fetch failed)" tells a visitor nothing.
    const cause =
      err instanceof Error && err.cause
        ? ((err.cause as { code?: string }).code ??
          (err.cause as Error).message ??
          null)
        : null;
    const reason = [err instanceof Error ? err.message : "network error", cause]
      .filter(Boolean)
      .join(": ");
    throw new LiveError(`TSETMC unreachable (${reason})`);
  }
  if (!response.ok) {
    throw new LiveError(`TSETMC returned ${response.status}`, response.status);
  }
  return response.text();
}

async function getJson(url: string, ua = BROWSER_UA): Promise<unknown> {
  const text = await get(url, ua);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new LiveError("TSETMC returned a non-JSON body");
  }
}

/**
 * TTL cache with in-flight de-duplication. The app is server-rendered and
 * several surfaces ask for the same board on one request; without this we
 * would hammer TSETMC and get the IP banned.
 */
const TTL = {
  realtime: 10_000,
  board: 5 * 60_000,
  history: 15 * 60_000,
  intraday: 2 * 60_000,
} as const;

type Entry = { at: number; value: Promise<unknown> };
const cache = new Map<string, Entry>();

function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < ttl) return hit.value as Promise<T>;
  const value = load().catch((err: unknown) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, { at: now, value });
  return value;
}

/** Compact `YYYYMMDD`, the format every TSETMC path segment wants. */
function compact(date: string): string {
  return date.replace(/-/g, "");
}

export function board(index: string): Promise<LiveBoard> {
  return cached(`board:${index}`, TTL.realtime, async () => {
    const text = await get(`${OLD}/instinfofast.aspx?i=${index}&c=0&e=1`);
    const parsed = parseBoard(text);
    if (!parsed) throw new LiveError("TSETMC returned an unreadable board");
    return parsed;
  });
}

/** The board's own date is the authoritative "last trading day" marker. */
export async function lastTradingDay(index: string): Promise<string> {
  const b = await board(index);
  return compact(b.last_date);
}

export function history(index: string): Promise<LiveBar[]> {
  return cached(`hist:${index}`, TTL.history, async () => {
    const text = await get(`${OLD}/Export-txt.aspx?t=i&a=1&b=0&i=${index}`);
    const bars = parseHistoryCsv(text);
    if (!bars.length) throw new LiveError("TSETMC returned no history rows");
    return bars;
  });
}

export function clientTypes(index: string) {
  return cached(`ct:${index}`, TTL.history, async () => {
    const text = await get(`${OLD}/clienttype.aspx?i=${index}`);
    return parseClientTypes(text);
  });
}

export function marketWatch() {
  return cached("mwi", TTL.board, async () => {
    const text = await get(`${OLD}/MarketWatchInit.aspx?h=0&r=0`, BROWSER_UA, BIG_FETCH_TIMEOUT_MS);
    const rows = parseMarketWatch(text);
    if (!rows.length) throw new LiveError("TSETMC returned an empty market board");
    return rows;
  });
}

export function search(symbol: string): Promise<LiveSymbolHit[]> {
  const key = `search:${normalizeFa(symbol)}`;
  return cached(key, TTL.board, async () => {
    const text = await get(
      `${OLD}/search.aspx?skey=${encodeURIComponent(symbol.trim())}`,
    );
    return parseSearch(text);
  });
}

export function instrumentInfo(index: string) {
  return cached(`info:${index}`, TTL.board, () =>
    getJson(`${CDN}/Instrument/GetInstrumentInfo/${index}`).then((payload) => {
      const info = parseInstrumentInfo(payload);
      if (!info) throw new LiveError("TSETMC returned no instrument info");
      return info;
    }),
  );
}

export function shareholders(index: string, date: string) {
  const day = compact(date);
  return cached(`sh:${index}:${day}`, TTL.intraday, () =>
    getJson(`${CDN}/Shareholder/${index}/${day}`).then((payload) =>
      parseShareholders(payload, day),
    ),
  );
}

export function bestLimits(
  index: string,
  date: string,
  depth = 5,
): Promise<LiveOrderBookLevel[]> {
  const day = compact(date);
  return cached(`ob:${index}:${day}:${depth}`, TTL.intraday, () =>
    getJson(`${CDN}/BestLimits/${index}/${day}`, ORDERBOOK_UA).then((payload) =>
      parseBestLimits(payload, depth),
    ),
  );
}

export function trades(index: string, date: string): Promise<LiveTick[]> {
  const day = compact(date);
  return cached(`tk:${index}:${day}`, TTL.intraday, () =>
    getJson(`${CDN}/Trade/GetTradeHistory/${index}/${day}/true`).then((payload) =>
      parseTrades(payload),
    ),
  );
}

/** Total shares outstanding for a day — the capital-increase history. */
export function totalShares(index: string, date: string) {
  const day = compact(date);
  return cached(`ts:${index}:${day}`, TTL.history, () =>
    getJson(`${CDN}/Instrument/GetInstrumentHistory/${index}/${day}`).then((payload) => {
      const record = (
        payload as { instrumentHistory?: Record<string, unknown> } | null
      )?.instrumentHistory;
      if (!record) throw new LiveError("TSETMC returned no share-count history");
      return {
        total_shares: Number(String(record.zTitad ?? 0)) || 0,
        base_vol: Number(String(record.baseVol ?? 0)) || 0,
      };
    }),
  );
}

export { aggregateTicks, type LiveShareholder };

/** A `YYYY-MM-DD` stepping back `count` calendar days from `from`. */
export function shiftDays(from: string, count: number): string {
  const date = new Date(`${from}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - count);
  return date.toISOString().slice(0, 10);
}

/**
 * Resolve a Persian symbol to a TSETMC index.
 *
 * TSETMC answers with Arabic kaf; the studio corpus and the URL the visitor
 * typed use Persian kaf, so every comparison goes through `normalizeFa`.
 */
export async function resolveIndex(symbolRaw: string): Promise<LiveSymbolHit> {
  const wanted = normalizeFa(symbolRaw);
  const hits = await search(symbolRaw);
  const hit =
    hits.find((h) => h.active && normalizeFa(h.symbol) === wanted) ??
    hits.find((h) => normalizeFa(h.symbol) === wanted) ??
    hits.find((h) => h.active) ??
    hits[0];
  if (!hit) throw new LiveError(`Cannot find symbol: ${symbolRaw}`);
  return hit;
}
