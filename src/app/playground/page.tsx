import type { Metadata } from "next";
import { db } from "@/db";
import { tickers } from "@/db/schema";
import { Playground } from "@/components/playground";
import { TOOLS } from "@/lib/catalog";
import { INSTRUMENTS } from "@/lib/instruments";
import { getMode, isLive } from "@/lib/mode";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Playground" };

export default async function PlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<{ tool?: string }>;
}) {
  const live = isLive(await getMode());
  const { tool } = await searchParams;
  const requested = TOOLS.find((t) => t.name === tool)?.name;

  // Demo mode lists the seeded corpus; live mode needs no database at all,
  // since the same twelve names are what this studio tracks on the exchange.
  let symbols: string[];
  if (live) {
    symbols = INSTRUMENTS.map((i) => i.symbol);
  } else {
    await ensureSeeded();
    symbols = (await db.select({ symbol: tickers.symbol }).from(tickers)).map((r) => r.symbol);
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
        POST /api/tools/invoke
      </p>
      <h1 className="mt-3 font-display text-5xl text-paper">Playground</h1>
      <p className="mt-4 max-w-2xl text-paper-dim">
        {live ? (
          <>
            Every tool below is answered live: this server calls TSETMC directly with
            the same requests <code className="text-gold">pytse-client</code> makes and
            returns the parsed JSON. Nothing is synthetic, and nothing is installed on
            your machine. Each response carries{" "}
            <code className="text-gold">source: &quot;live-tsetmc&quot;</code> and{" "}
            <code className="text-gold">demo: false</code>.
          </>
        ) : (
          <>
            Invoke every tool against the studio corpus — deterministic synthetic
            snapshots of major TSE names, so agents can rehearse without hammering
            TSETMC. Every response carries <code className="text-gold">demo: true</code>.
            Switch demo mode off to run the same tools against the live exchange.
          </>
        )}
      </p>
      <div className="mt-10">
        <Playground tools={TOOLS} symbols={symbols} initialTool={requested} />
      </div>
    </main>
  );
}
