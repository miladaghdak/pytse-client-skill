import type { Metadata } from "next";
import { db } from "@/db";
import { tickers } from "@/db/schema";
import { Playground } from "@/components/playground";
import { TOOLS } from "@/lib/catalog";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Playground" };

export default async function PlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<{ tool?: string }>;
}) {
  await ensureSeeded();
  const { tool } = await searchParams;
  const requested = TOOLS.find((t) => t.name === tool)?.name;
  const rows = await db.select({ symbol: tickers.symbol }).from(tickers);
  return (
    <main className="mx-auto max-w-7xl px-5 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
        POST /api/tools/invoke
      </p>
      <h1 className="mt-3 font-display text-5xl text-paper">Playground</h1>
      <p className="mt-4 max-w-2xl text-paper-dim">
        Studio corpus — deterministic synthetic snapshots of major TSE names so agents
        can rehearse without hammering TSETMC. Bundled Python scripts hit the live
        exchange. Every response below is demo data — say which source you used.
      </p>
      <div className="mt-10">
        <Playground
          tools={TOOLS}
          symbols={rows.map((r) => r.symbol)}
          initialTool={requested}
        />
      </div>
    </main>
  );
}
