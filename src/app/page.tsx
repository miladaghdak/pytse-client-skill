import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { financialIndexes, tickerBars, tickers } from "@/db/schema";
import { DemoBadge } from "@/components/demo-badge";
import { LiveFallback } from "@/components/demo-notice";
import { Sparkline } from "@/components/sparkline";
import { SKILL_FILES, SKILL_META, TOOLS } from "@/lib/catalog";
import { formatInt, formatPct, formatPx, pctChange } from "@/lib/format";
import { liveQuotes } from "@/lib/live-view";
import { getMode, isLive } from "@/lib/mode";
import { normalizeFa } from "@/lib/persian";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

const REPO_URL = "https://github.com/MiladAghdak/pytse-client-skill";

const CAPABILITIES = [
  { k: "01", t: "Adjusted OHLCV", d: "Split-aware daily history for one name or the whole board." },
  { k: "02", t: "Realtime board", d: "Last, close, the five-level bid/ask book, and حقیقی/حقوقی summaries." },
  { k: "03", t: "Order book", d: "Historical five-level book with async fetch and diff mode." },
  { k: "04", t: "Ticks & bars", d: "Last-day ticks or 30s–1h aggregations across a date range." },
  { k: "05", t: "Retail flow", d: "حقیقی vs حقوقی counts, volumes, values, ownership change." },
  { k: "06", t: "Shareholders", d: "Major holders, implied float, and slow daily history — fetched serially." },
  { k: "07", t: "شاخص‌ها", d: "شاخص کل, equal-weight, and sector indexes — history plus intraday." },
  { k: "08", t: "فیلترنویسی", d: "get_stats joins key stats, market watch, and client types." },
  { k: "09", t: "Agent-native", d: "SKILL.md, scripts that print JSON, MCP tools, HTTP invoke." },
];

/** One row of the ticker tape and the universe grid, in either mode. */
type Tape = {
  symbol: string;
  last: number;
  chg: number;
  values: number[];
  high: number;
  low: number;
};

export default async function HomePage() {
  const live = isLive(await getMode());

  let tapes: Tape[] = [];
  let tedpix: { last: number; date: string; values: number[] } | null = null;
  let tracked = 0;
  let liveReason: string | null = null;

  if (live) {
    // One upstream call for the whole page: the live board.
    const list = await liveQuotes();
    liveReason = list.reason;
    tracked = list.quotes.length;
    tapes = list.quotes.map((q) => ({
      symbol: q.symbol,
      last: q.last,
      chg: q.changePct,
      // MarketWatchInit has no history, so no sparkline — the card shows the
      // session range instead of inventing a series.
      values: [],
      high: q.high,
      low: q.low,
    }));
    // `tedpix` stays null on purpose. TSETMC no longer serves a financial-index
    // series: IndexFinancial/InitIndex/Index.aspx answer with the site homepage,
    // Export-txt and instinfofast answer empty for an index code, and the market
    // board carries no index rows. There is nothing to show but a made-up number.
  } else {
    await ensureSeeded();
    const rows = await db.select().from(tickers);
    const idx = await db.select().from(financialIndexes);
    // DB rows keep the upstream Arabic kaf (شاخص كل) — normalize both sides.
    const seed = idx.find((i) => normalizeFa(i.symbol) === normalizeFa("شاخص کل"));
    tracked = rows.length;
    if (seed) {
      tedpix = { last: seed.lastValue, date: seed.lastUpdate, values: [] };
    }

    for (const t of rows) {
      const bars = await db
        .select({ close: tickerBars.close })
        .from(tickerBars)
        .where(eq(tickerBars.tickerId, t.id))
        .orderBy(desc(tickerBars.date))
        .limit(24);
      tapes.push({
        symbol: t.symbol,
        last: t.lastPrice,
        chg: pctChange(t.lastPrice, t.yesterdayPrice),
        values: bars.reverse().map((b) => b.close),
        high: t.highPrice,
        low: t.lowPrice,
      });
    }
  }

  return (
    <main>
      <section className="geo-grid relative isolate min-h-[88vh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/55 to-ink" />
        <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-end px-5 pb-16 pt-28">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-gold">
            agentskills.io · GPL-3.0 · pytse-client {SKILL_META.sourceVersion}
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-[clamp(3.2rem,8vw,7.2rem)] leading-[0.88] tracking-tight text-paper">
            Tehran market,
            <span className="block italic text-gold-2">packaged for agents.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-paper-dim">
            A complete Agent Skill for بورس اوراق بهادار تهران, wrapping{" "}
            <a
              className="text-gold underline-offset-4 hover:underline"
              href="https://github.com/Glyphack/pytse-client"
            >
              Glyphack/pytse-client
            </a>{" "}
            v{SKILL_META.sourceVersion}. Progressive disclosure, JSON-first scripts, and
            16 tools. Switch the demo toggle off and this site fetches TSETMC for you —
            no install, no Python.
          </p>
          <p className="font-fa mt-3 text-base text-paper-dim" dir="rtl">
            داده‌های بازار بورس تهران — تاریخچه قیمت، تابلوی لحظه‌ای، جریان حقیقی و حقوقی،
            سهامداران عمده و شاخص‌ها.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/install"
              className="bg-gold px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink"
            >
              Install SKILL.md
            </Link>
            <Link
              href="/playground"
              className="border border-paper/30 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-paper"
            >
              Open playground
            </Link>
            <a
              href={REPO_URL}
              className="border border-paper/20 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-paper-dim transition hover:border-gold/50 hover:text-gold"
            >
              Source on GitHub
            </a>
          </div>
          {live ? (
            <p className="mt-10 flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-paper-dim">
              <DemoBadge live />
              <span>Live TSETMC · {tracked} symbols on the board</span>
            </p>
          ) : tedpix ? (
            <p className="mt-10 flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-paper-dim">
              <DemoBadge live={live} />
              <span className="font-fa">
                شاخص کل · {formatInt(tedpix.last)}
                {tedpix.date ? ` · ${tedpix.date}` : ""}
              </span>
              <span>· {live ? "fetched from TSETMC" : "synthetic seed"}</span>
              {tedpix.values.length > 1 ? <Sparkline values={tedpix.values} /> : null}
            </p>
          ) : null}
          {live ? (
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-paper-dim">
              The شاخص کل line is demo-only. TSETMC no longer publishes a
              financial-index series over HTTP — every index endpoint answers with
              the site homepage or an empty body, and the market board carries no
              index rows — so live mode omits it rather than show a stale number.
            </p>
          ) : null}
        </div>
      </section>

      <p className="border-b border-[rgba(243,236,220,0.1)] bg-ink-2 py-2 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-paper-dim">
        {live
          ? "Live TSETMC — fetched by this server, nothing installed"
          : "Synthetic demo corpus — not live TSETMC"}
      </p>

      <div className="overflow-hidden border-b border-[rgba(243,236,220,0.1)] bg-ink-2 py-3">
        <div className="ticker-track">
          {[...tapes, ...tapes].map((t, i) => (
            <div key={`${t.symbol}-${i}`} className="flex items-center gap-3">
              <span className="font-fa text-sm text-paper">{t.symbol}</span>
              <span className="font-mono text-xs text-paper-dim">{formatPx(t.last)}</span>
              <span className={`font-mono text-xs ${t.chg >= 0 ? "text-teal" : "text-rose"}`}>
                {formatPct(t.chg)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">The skill</p>
          <h2 className="mt-3 font-display text-4xl leading-tight text-paper md:text-5xl">
            One folder. Progressive disclosure. The whole TSE surface.
          </h2>
          <p className="mt-5 max-w-xl text-paper-dim">
            Hosts load only <em>name</em> + <em>description</em> at startup (~100 tokens).
            SKILL.md activates on Iranian-market tasks. References and scripts load on
            demand — never dump the 40k README into context.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["16", "tools"],
              [String(SKILL_FILES.length), "bundled files"],
              [String(tracked), live ? "live symbols" : "studio symbols"],
            ].map(([n, l]) => (
              <div key={l} className="panel p-4">
                <p className="font-display text-3xl text-gold-2">{n}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-paper-dim">
                  {l}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="panel p-6 font-mono text-[12px] leading-loose text-paper-dim">
          <p className="text-gold">pytse-client/</p>
          <p className="pl-4">SKILL.md</p>
          <p className="pl-4">LICENSE</p>
          <p className="pl-4">assets/tools.json</p>
          <p className="pl-4 text-paper">
            references/ · {SKILL_FILES.filter((f) => f.kind === "reference").length} files
          </p>
          <p className="pl-4 text-paper">
            scripts/ · {SKILL_FILES.filter((f) => f.kind === "script").length} files
          </p>
          <p className="mt-3 pl-0 text-[10px] uppercase tracking-[0.18em]">
            install the folder, not the repo
          </p>
        </div>
      </section>

      <section className="geo-grid border-y border-[rgba(243,236,220,0.1)]">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
            Capabilities · from upstream
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {CAPABILITIES.map((c) => (
              <article key={c.k} className="panel p-5">
                <p className="font-mono text-[10px] text-gold">{c.k}</p>
                <h3 className="mt-3 font-display text-2xl text-paper">{c.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper-dim">{c.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">Universe</p>
            <h2 className="mt-3 flex flex-wrap items-center gap-3 font-display text-4xl text-paper">
              {live ? "Traded on TSETMC" : "Studio corpus"} <DemoBadge live={live} />
            </h2>
          </div>
          <Link href="/tickers" className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
            All symbols →
          </Link>
        </div>
        <div className="mt-10">
          {live && liveReason ? (
            <LiveFallback context="The universe grid" reason={liveReason} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {tapes.map((t) => (
                <Link
                  key={t.symbol}
                  href={`/tickers/${encodeURIComponent(t.symbol)}`}
                  className="panel flex items-center justify-between gap-4 p-4 transition hover:border-gold/40"
                >
                  <div>
                    <p className="font-fa text-lg text-paper">{t.symbol}</p>
                    <p className="font-mono text-xs text-paper-dim">{formatPx(t.last)}</p>
                  </div>
                  <div className="text-right">
                    {t.values.length > 1 ? (
                      <Sparkline values={t.values} />
                    ) : (
                      <p className="font-mono text-[10px] text-paper-dim">
                        {formatPx(t.low)} – {formatPx(t.high)}
                      </p>
                    )}
                    <p className={`mt-1 font-mono text-xs ${t.chg >= 0 ? "text-teal" : "text-rose"}`}>
                      {formatPct(t.chg)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">Python surface</p>
        <h2 className="mt-3 font-display text-4xl text-paper">16 tools, one import.</h2>
        <div className="mt-10 grid gap-3 md:grid-cols-2">
          {TOOLS.slice(0, 8).map((t) => (
            <article key={t.name} className="panel min-w-0 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">{t.category}</p>
              <h3 className="mt-2 font-mono text-sm text-paper">{t.name}</h3>
              <p className="mt-2 text-sm text-paper-dim">{t.summary}</p>
              <pre className="mt-3 overflow-x-auto font-mono text-[11px] text-gold-2">{t.pythonApi}</pre>
            </article>
          ))}
        </div>
        <Link
          href="/tools"
          className="mt-8 inline-block font-mono text-[11px] uppercase tracking-[0.18em] text-gold"
        >
          Full catalog →
        </Link>
      </section>
    </main>
  );
}
