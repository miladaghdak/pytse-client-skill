import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { financialIndexes, tickerBars, tickers } from "@/db/schema";
import { DemoBadge } from "@/components/demo-badge";
import { Sparkline } from "@/components/sparkline";
import { SKILL_FILES, SKILL_META, TOOLS } from "@/lib/catalog";
import { formatInt, formatPct, formatPx, pctChange } from "@/lib/format";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

const CAPABILITIES = [
  { k: "01", t: "Adjusted OHLCV", d: "Split-aware daily history for one name or the whole board." },
  { k: "02", t: "Realtime board", d: "Last, close, پنج مظنه, state, and حقیقی/حقوقی summaries." },
  { k: "03", t: "Order book", d: "Historical five-level book with async fetch and diff mode." },
  { k: "04", t: "Ticks & bars", d: "Last-day ticks or 30s–1h aggregations across a date range." },
  { k: "05", t: "Retail flow", d: "حقیقی vs حقوقی counts, volumes, values, ownership change." },
  { k: "06", t: "Shareholders", d: "Major holders, implied float, and slow daily history — serially." },
  { k: "07", t: "شاخص‌ها", d: "شاخص کل, equal-weight, sectors — history plus intraday." },
  { k: "08", t: "فیلترنویسی", d: "get_stats joins key stats, market watch, and client types." },
  { k: "09", t: "Agent-native", d: "SKILL.md, scripts that print JSON, MCP tools, HTTP invoke." },
];

export default async function HomePage() {
  await ensureSeeded();
  const rows = await db.select().from(tickers);
  const idx = await db.select().from(financialIndexes);
  const tedpix = idx.find((i) => i.symbol === "شاخص کل");

  const tapes = [];
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
    });
  }

  return (
    <main>
      <section className="geo-grid relative isolate min-h-[88vh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/55 to-ink" />
        <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-end px-5 pb-16 pt-28">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-gold">
            agentskills.io · GPLv3 · pytse-client {SKILL_META.sourceVersion}
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-[clamp(3.2rem,8vw,7.2rem)] leading-[0.88] tracking-tight text-paper">
            Tehran market,
            <span className="block italic text-gold-2">packaged for agents.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-paper-dim">
            A complete Agent Skill for بورس اوراق بهادار تهران. Progressive disclosure,
            JSON-first scripts, sixteen tools, and a deterministic studio corpus so hosts
            can practice without burning TSETMC.
          </p>
          <p className="font-fa mt-3 text-base text-paper-dim" dir="rtl">
            دریافت اطلاعات بازار بورس تهران — تاریخچه، لحظه‌ای، حقیقی حقوقی، سهامداران، شاخص.
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
              href="https://github.com/Glyphack/pytse-client"
              className="border border-paper/20 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-paper-dim"
            >
              Upstream repo
            </a>
          </div>
          {tedpix ? (
            <p className="mt-10 flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-[0.18em] text-paper-dim">
              <DemoBadge />
              <span className="font-fa">
                شاخص کل · {formatInt(tedpix.lastValue)} · {tedpix.lastUpdate}
              </span>
              <span>· synthetic seed</span>
            </p>
          ) : null}
        </div>
      </section>

      <p className="border-b border-[rgba(243,236,220,0.1)] bg-ink-2 py-2 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-paper-dim">
        Synthetic demo corpus — not live TSETMC
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
              [String(rows.length), "studio symbols"],
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
              Studio corpus <DemoBadge />
            </h2>
          </div>
          <Link href="/tickers" className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
            All symbols →
          </Link>
        </div>
        <div className="mt-10 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                <Sparkline values={t.values} />
                <p className={`mt-1 font-mono text-xs ${t.chg >= 0 ? "text-teal" : "text-rose"}`}>
                  {formatPct(t.chg)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">Python surface</p>
        <h2 className="mt-3 font-display text-4xl text-paper">Sixteen tools, one import.</h2>
        <div className="mt-10 grid gap-3 md:grid-cols-2">
          {TOOLS.slice(0, 8).map((t) => (
            <article key={t.name} className="panel p-5">
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
