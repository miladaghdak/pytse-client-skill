import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { invocations } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Console" };

export default async function ConsolePage() {
  await ensureSeeded();
  const rows = await db.select().from(invocations).orderBy(desc(invocations.createdAt)).limit(40);

  return (
    <main className="mx-auto max-w-7xl px-5 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
        Invocation log
      </p>
      <h1 className="mt-3 font-display text-5xl text-paper">Console</h1>
      <p className="mt-4 max-w-2xl text-paper-dim">
        Every playground and HTTP invoke is persisted. Use this to debug agent loops
        and to see which tools fire on which prompts.
      </p>
      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper-dim">
            <tr className="border-b border-[rgba(243,236,220,0.12)]">
              <th className="py-3 pr-4">When</th>
              <th className="py-3 pr-4">Tool</th>
              <th className="py-3 pr-4">OK</th>
              <th className="py-3 pr-4">ms</th>
              <th className="py-3">Input</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-paper-dim">
                  No invocations yet. Open the playground.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-[rgba(243,236,220,0.08)]">
                  <td className="py-3 pr-4 font-mono text-xs text-paper-dim">
                    {r.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-gold">{r.toolName}</td>
                  <td className={`py-3 pr-4 font-mono text-xs ${r.ok ? "text-teal" : "text-rose"}`}>
                    {r.ok ? "ok" : r.error ?? "err"}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs">{r.latencyMs}</td>
                  <td className="py-3 font-mono text-[11px] text-paper-dim">
                    {JSON.stringify(r.input)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
