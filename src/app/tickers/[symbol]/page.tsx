import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientTypeDays, shareholders, tickerBars, tickers } from "@/db/schema";
import { CandleChart } from "@/components/sparkline";
import { DemoBadge } from "@/components/demo-badge";
import { formatCompact, formatInt, formatPct, formatPx, pctChange } from "@/lib/format";
import { normalizeFa } from "@/lib/persian";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  return { title: safeDecode(symbol) };
}

function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default async function TickerPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  await ensureSeeded();
  const { symbol } = await params;
  const decoded = normalizeFa(safeDecode(symbol));
  const all = await db.select().from(tickers);
  const t = all.find((row) => normalizeFa(row.symbol) === decoded);
  if (!t) notFound();

  const bars = await db
    .select()
    .from(tickerBars)
    .where(eq(tickerBars.tickerId, t.id))
    .orderBy(tickerBars.date);
  const holders = await db
    .select()
    .from(shareholders)
    .where(eq(shareholders.tickerId, t.id));
  const flow = await db
    .select()
    .from(clientTypeDays)
    .where(eq(clientTypeDays.tickerId, t.id))
    .orderBy(clientTypeDays.date);
  const lastFlow = flow[flow.length - 1];
  const chg = pctChange(t.lastPrice, t.yesterdayPrice);
  const major = holders.reduce((a, h) => a + h.percentage, 0);

  const metrics: [string, string][] = [
    ["Last", formatPx(t.lastPrice)],
    ["Close", formatPx(t.adjClose)],
    ["Open", formatPx(t.openPrice)],
    ["High", formatPx(t.highPrice)],
    ["Low", formatPx(t.lowPrice)],
    ["Volume", formatCompact(t.volume)],
    ["Value", formatCompact(t.value)],
    ["Count", formatInt(t.tradeCount)],
    ["EPS", t.eps != null ? formatPx(t.eps) : "—"],
    ["P/E", t.peRatio != null ? t.peRatio.toFixed(2) : "—"],
    ["Group P/E", t.groupPeRatio != null ? t.groupPeRatio.toFixed(2) : "—"],
    ["NAV", t.nav != null ? formatPx(t.nav) : "—"],
    ["Base vol", formatCompact(t.baseVolume)],
    ["Float %", t.floatShares.toFixed(1)],
    ["Shares", formatCompact(t.totalShares)],
    ["Mkt cap", formatCompact(t.marketCap)],
    ["Allowed Δ", `${formatPx(t.staMin)} – ${formatPx(t.staMax)}`],
    ["Year range", `${formatPx(t.minYear)} – ${formatPx(t.maxYear)}`],
  ];

  const buy = (t.buyOrders as { count: number; volume: number; price: number }[]) ?? [];
  const sell = (t.sellOrders as { count: number; volume: number; price: number }[]) ?? [];

  return (
    <main className="mx-auto max-w-7xl px-5 py-16">
      <Link href="/tickers" className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold">
        ← Universe
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-fa text-sm text-paper-dim">{t.fullTitle}</p>
          <h1 className="font-fa mt-1 text-5xl text-paper">{t.symbol}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-paper-dim">
            <DemoBadge />
            <span>
              {t.flow} · {t.state} · {t.indexCode} · {t.isin}
            </span>
          </p>
          <p className="mt-1 text-xs text-paper-dim">
            Deterministic demo snapshot — not live TSETMC data.
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-5xl text-paper">{formatPx(t.lastPrice)}</p>
          <p className={`font-mono text-sm ${chg >= 0 ? "text-teal" : "text-rose"}`}>
            {formatPct(chg)} vs yesterday {formatPx(t.yesterdayPrice)}
          </p>
        </div>
      </div>

      <section className="panel mt-10 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">Daily candles</p>
        <div className="mt-4">
          <CandleChart bars={bars} />
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map(([k, v]) => (
          <div key={k} className="panel p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper-dim">{k}</p>
            <p className="mt-2 font-mono text-sm text-paper">{v}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="panel p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
            Five-level book
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 font-mono text-xs">
            <div>
              <p className="text-teal">Bids</p>
              {buy.map((o, i) => (
                <p key={i} className="mt-1 flex justify-between text-paper-dim">
                  <span>{formatInt(o.volume)}</span>
                  <span className="text-paper">{formatPx(o.price)}</span>
                </p>
              ))}
            </div>
            <div>
              <p className="text-rose">Asks</p>
              {sell.map((o, i) => (
                <p key={i} className="mt-1 flex justify-between text-paper-dim">
                  <span className="text-paper">{formatPx(o.price)}</span>
                  <span>{formatInt(o.volume)}</span>
                </p>
              ))}
            </div>
          </div>
        </article>
        <article className="panel p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
            حقیقی / حقوقی · last session
          </p>
          {lastFlow ? (
            <dl className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs">
              <div>
                <dt className="text-paper-dim">Ind buy vol</dt>
                <dd className="text-teal">{formatCompact(lastFlow.individualBuyVol)}</dd>
              </div>
              <div>
                <dt className="text-paper-dim">Ind sell vol</dt>
                <dd className="text-rose">{formatCompact(lastFlow.individualSellVol)}</dd>
              </div>
              <div>
                <dt className="text-paper-dim">Corp buy vol</dt>
                <dd className="text-teal">{formatCompact(lastFlow.corporateBuyVol)}</dd>
              </div>
              <div>
                <dt className="text-paper-dim">Corp sell vol</dt>
                <dd className="text-rose">{formatCompact(lastFlow.corporateSellVol)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-paper-dim">Ownership Δ (ind)</dt>
                <dd className="text-paper">{formatCompact(lastFlow.individualOwnershipChange)}</dd>
              </div>
            </dl>
          ) : null}
        </article>
      </section>

      <section className="panel mt-8 p-5">
        <div className="flex items-end justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
            Major shareholders
          </p>
          <p className="font-mono text-[11px] text-paper-dim">
            sum {major.toFixed(2)}% · implied float {(100 - major).toFixed(2)}% · reported{" "}
            {t.floatShares}%
          </p>
        </div>
        <ul className="mt-4 space-y-2">
          {holders.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-4 text-sm">
              <span className="font-fa text-paper">{h.name}</span>
              <span className="font-mono text-xs text-paper-dim">
                {h.percentage.toFixed(2)}% · {formatCompact(h.shares)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 font-mono text-[11px] text-paper-dim">
        <a className="text-gold" href={t.tsetmcUrl}>
          Open on TSETMC
        </a>
        {" · "}
        <Link href={`/playground`} className="text-gold">
          Invoke tools
        </Link>
      </p>
    </main>
  );
}
