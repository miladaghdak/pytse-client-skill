import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tickerBars, tickers } from "@/db/schema";
import { Sparkline } from "@/components/sparkline";
import { DemoBadge } from "@/components/demo-badge";
import { LiveFallback } from "@/components/demo-notice";
import { formatCompact, formatInt, formatPct, formatPx, pctChange } from "@/lib/format";
import { liveQuotes, type LiveQuote } from "@/lib/live-view";
import { getMode, isLive } from "@/lib/mode";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Universe" };

export default async function TickersPage() {
  const live = isLive(await getMode());

  if (live) {
    const { quotes, boardSize, reason } = await liveQuotes();
    return (
      <main className="mx-auto max-w-7xl px-5 py-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
          Live universe · {quotes.length} tracked of {formatInt(boardSize)}
        </p>
        <h1 className="mt-3 flex flex-wrap items-center gap-3 font-display text-5xl text-paper">
          Priced by TSETMC <DemoBadge live />
        </h1>
        <p className="mt-4 max-w-2xl text-paper-dim">
          Every number below is fetched live from Tehran Stock Exchange by this
          server — nothing synthetic, nothing installed. The studio tracks{" "}
          {quotes.length} major names out of the {formatInt(boardSize)} instruments on
          the exchange board; P/E is computed from the published EPS.
        </p>
        {reason ? (
          <div className="mt-10">
            <LiveFallback context="The universe table" reason={reason} />
          </div>
        ) : (
          <LiveTable quotes={quotes} />
        )}
      </main>
    );
  }

  await ensureSeeded();
  const rows = await db.select().from(tickers);

  const cards = [];
  for (const t of rows) {
    const bars = await db
      .select({ close: tickerBars.close })
      .from(tickerBars)
      .where(eq(tickerBars.tickerId, t.id))
      .orderBy(desc(tickerBars.date))
      .limit(30);
    cards.push({ t, values: bars.reverse().map((b) => b.close) });
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
        Studio universe · {rows.length} names
      </p>
      <h1 className="mt-3 flex flex-wrap items-center gap-3 font-display text-5xl text-paper">
        Listed in the corpus <DemoBadge />
      </h1>
      <p className="mt-4 max-w-2xl text-paper-dim">
        Curated majors spanning steel, banks, refiners, autos, petrochemicals, holdings,
        miners, and a leveraged ETF. Every price, P/E, and market cap below is
        deterministic synthetic demo data — not live TSETMC quotes. Switch demo mode off
        to see the same names priced live, or call upstream{" "}
        <code className="text-gold">all_symbols()</code> for the full TSETMC map.
      </p>
      <div className="mt-10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper-dim">
              <tr className="border-b border-[rgba(243,236,220,0.12)]">
                <th className="py-3 pr-4">Symbol</th>
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Group</th>
                <th className="py-3 pr-4">Last</th>
                <th className="py-3 pr-4">Chg</th>
                <th className="py-3 pr-4">P/E</th>
                <th className="py-3 pr-4">Mkt cap</th>
                <th className="py-3">30d</th>
              </tr>
            </thead>
            <tbody>
              {cards.map(({ t, values }) => {
                const chg = pctChange(t.lastPrice, t.yesterdayPrice);
                return (
                  <tr key={t.id} className="border-b border-[rgba(243,236,220,0.08)]">
                    <td className="py-3 pr-4">
                      <Link href={`/tickers/${encodeURIComponent(t.symbol)}`} className="font-fa text-gold">
                        {t.symbol}
                      </Link>
                    </td>
                    <td className="font-fa py-3 pr-4 text-paper-dim">{t.title}</td>
                    <td className="font-fa py-3 pr-4 text-paper-dim">{t.groupName}</td>
                    <td className="py-3 pr-4 font-mono">{formatPx(t.lastPrice)}</td>
                    <td className={`py-3 pr-4 font-mono ${chg >= 0 ? "text-teal" : "text-rose"}`}>
                      {formatPct(chg)}
                    </td>
                    <td className="py-3 pr-4 font-mono text-paper-dim">
                      {t.peRatio ? t.peRatio.toFixed(2) : "—"}
                    </td>
                    <td className="py-3 pr-4 font-mono text-paper-dim">{formatCompact(t.marketCap)}</td>
                    <td className="py-3">
                      <Sparkline values={values} width={120} height={32} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-6 font-mono text-[10px] text-paper-dim">{formatInt(rows.length)} rows</p>
      </div>
    </main>
  );
}

/**
 * The live table. MarketWatchInit carries no market capitalisation and no
 * history, so those two corpus columns give way to traded value and the
 * session's high/low — real figures rather than invented ones.
 */
function LiveTable({ quotes }: { quotes: LiveQuote[] }) {
  return (
    <div className="mt-10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper-dim">
            <tr className="border-b border-[rgba(243,236,220,0.12)]">
              <th className="py-3 pr-4">Symbol</th>
              <th className="py-3 pr-4">Name</th>
              <th className="py-3 pr-4">Group</th>
              <th className="py-3 pr-4">Last</th>
              <th className="py-3 pr-4">Chg</th>
              <th className="py-3 pr-4">P/E</th>
              <th className="py-3 pr-4">Value</th>
              <th className="py-3">Session</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.index} className="border-b border-[rgba(243,236,220,0.08)]">
                <td className="py-3 pr-4">
                  <Link href={`/tickers/${encodeURIComponent(q.symbol)}`} className="font-fa text-gold">
                    {q.symbol}
                  </Link>
                </td>
                <td className="font-fa py-3 pr-4 text-paper-dim">{q.name}</td>
                <td className="font-fa py-3 pr-4 text-paper-dim">{q.groupName}</td>
                <td className="py-3 pr-4 font-mono">{formatPx(q.last)}</td>
                <td
                  className={`py-3 pr-4 font-mono ${q.changePct >= 0 ? "text-teal" : "text-rose"}`}
                >
                  {formatPct(q.changePct)}
                </td>
                <td className="py-3 pr-4 font-mono text-paper-dim">
                  {q.peRatio ? q.peRatio.toFixed(2) : "—"}
                </td>
                <td className="py-3 pr-4 font-mono text-paper-dim">{formatCompact(q.value)}</td>
                <td className="py-3 font-mono text-[11px] text-paper-dim">
                  {formatPx(q.low)} – {formatPx(q.high)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-6 font-mono text-[10px] text-paper-dim">
        {formatInt(quotes.length)} rows · fetched from TSETMC by this server
      </p>
    </div>
  );
}
