import type { Metadata } from "next";
import { db } from "@/db";
import { evalCases } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Evals" };

export default async function EvalsPage() {
  await ensureSeeded();
  const rows = await db.select().from(evalCases);
  const pos = rows.filter((r) => r.shouldTrigger).length;

  return (
    <main className="mx-auto max-w-7xl px-5 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
        Description triggering
      </p>
      <h1 className="mt-3 font-display text-5xl text-paper">Skill evals</h1>
      <p className="mt-4 max-w-2xl text-paper-dim">
        The description field is a router, not marketing copy. These cases check that
        Iranian-market prompts activate pytse-client and that NYSE/crypto prompts do not.
        {` `}
        {pos} should-trigger · {rows.length - pos} should-not.
      </p>
      <ol className="mt-10 space-y-4">
        {rows.map((r, i) => (
          <li key={r.id} className="panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                {String(i + 1).padStart(2, "0")} · {r.language} ·{" "}
                {r.shouldTrigger ? "must activate" : "must ignore"}
              </p>
              {r.expectedTool ? (
                <p className="font-mono text-[11px] text-paper-dim">{r.expectedTool}</p>
              ) : null}
            </div>
            <p className="font-fa mt-3 text-lg text-paper" dir={r.language === "fa" ? "rtl" : "ltr"}>
              {r.prompt}
            </p>
            <p className="mt-2 text-sm text-paper-dim">{r.notes}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
