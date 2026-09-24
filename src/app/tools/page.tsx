import type { Metadata } from "next";
import Link from "next/link";
import { TOOLS } from "@/lib/catalog";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tools" };

export default async function ToolsPage() {
  await ensureSeeded();
  const cats = Array.from(new Set(TOOLS.map((t) => t.category)));
  return (
    <main className="mx-auto max-w-7xl px-5 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
        {TOOLS.length} tools · JSON schema
      </p>
      <h1 className="mt-3 font-display text-5xl text-paper">Tool catalog</h1>
      <p className="mt-4 max-w-2xl text-paper-dim">
        Each tool maps 1:1 onto a pytse-client function. Invoke via the playground,{" "}
        <code className="text-gold">POST /api/tools/invoke</code>, or MCP{" "}
        <code className="text-gold">/api/mcp/call</code>.
      </p>
      <div className="mt-12 space-y-12">
        {cats.map((cat) => (
          <section key={cat}>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.24em] text-gold">{cat}</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {TOOLS.filter((t) => t.category === cat).map((t) => (
                <article key={t.name} className="panel p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-mono text-sm text-paper">{t.name}</h3>
                    <Link
                      href={`/playground?tool=${t.name}`}
                      className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold"
                    >
                      Run
                    </Link>
                  </div>
                  <p className="mt-2 text-sm text-paper-dim">{t.summary}</p>
                  <pre className="mt-3 overflow-x-auto font-mono text-[11px] text-gold-2">
                    {t.pythonApi}
                  </pre>
                  {t.script ? (
                    <p className="mt-3 font-mono text-[10px] text-paper-dim">script · {t.script}</p>
                  ) : null}
                  <p className="mt-3 text-xs leading-relaxed text-paper-dim">
                    <span className="text-rose">Pitfall.</span> {t.pitfalls}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
