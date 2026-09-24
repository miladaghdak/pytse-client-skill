import type { Metadata } from "next";
import { SKILL_FILES, TOOLS } from "@/lib/catalog";

export const metadata: Metadata = { title: "Docs" };

const SNIPPETS = [
  {
    title: "Download history",
    code: `import pytse_client as tse

frames = tse.download(symbols=["فولاد", "وبملت"], adjust=True, include_jdate=True)
print(frames["فولاد"].tail())`,
  },
  {
    title: "Ticker board",
    code: `ticker = tse.Ticker("نوری")
print(ticker.title, ticker.eps, ticker.p_e_ratio, ticker.float_shares)
rt = ticker.get_ticker_real_time_info_response()
for bid in rt.buy_orders:
    print(bid.volume, bid.count, bid.price)`,
  },
  {
    title: "Index",
    code: `idx = tse.FinancialIndex("شاخص کل")
print(idx.last_value, idx.last_update, idx.history.tail())`,
  },
  {
    title: "Intraday",
    code: `from datetime import date
df = tse.get_trade_details("اهرم", date(2023,3,19), date(2023,4,22),
                           aggregate=True, timeframe="1m")`,
  },
];

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
        Field manual
      </p>
      <h1 className="mt-3 font-display text-5xl text-paper">How an agent should work</h1>
      <p className="mt-4 max-w-2xl text-paper-dim">
        Follow SKILL.md, then open only the reference the decision tree names. Prefer
        bundled scripts. Summarise DataFrames; never paste a 2,000-row pandas repr.
      </p>

      <section className="mt-12 grid gap-4 md:grid-cols-2">
        {SNIPPETS.map((s) => (
          <article key={s.title} className="panel p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">{s.title}</p>
            <pre className="mt-3 overflow-x-auto font-mono text-[12px] leading-relaxed text-paper">
              {s.code}
            </pre>
          </article>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="font-display text-3xl text-paper">HTTP for hosts</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {[
            ["GET", "/api/skill", "Catalog: name, description, files, tools"],
            ["GET", "/api/skill/md", "Reconstructed SKILL.md"],
            ["GET", "/api/tools", "JSON Schema for every tool"],
            ["POST", "/api/tools/invoke", "{ tool, input, agent }"],
            ["GET", "/api/mcp/tools", "MCP-shaped list"],
            ["POST", "/api/mcp/call", "{ name, arguments }"],
            ["GET", "/api/tickers", "Studio universe"],
            ["GET", "/api/health", "Postgres ping"],
          ].map(([m, p, d]) => (
            <div key={p} className="panel flex items-start justify-between gap-4 p-4">
              <div>
                <p className="font-mono text-xs text-gold">
                  {m} {p}
                </p>
                <p className="mt-1 text-sm text-paper-dim">{d}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-paper-dim">
          All HTTP data endpoints serve the synthetic studio corpus (demo: true) — never live TSETMC.
        </p>
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-2">
        <article>
          <h2 className="font-display text-3xl text-paper">References</h2>
          <ul className="mt-4 space-y-2">
            {SKILL_FILES.filter((f) => f.kind === "reference" || f.path === "SKILL.md").map((f) => (
              <li key={f.path}>
                <a
                  href={`/skills/pytse-client/${f.path}`}
                  className="font-mono text-sm text-gold hover:underline"
                >
                  {f.path}
                </a>
                <span className="ml-2 text-sm text-paper-dim">{f.summary}</span>
              </li>
            ))}
          </ul>
        </article>
        <article>
          <h2 className="font-display text-3xl text-paper">Units & calendar</h2>
          <ul className="mt-4 space-y-2 text-sm text-paper-dim">
            <li>Prices and values are Iranian Rials. Toman = Rial / 10.</li>
            <li>Cash session 09:00–12:30 Tehran, Saturday–Wednesday.</li>
            <li>Export dates are Gregorian; pass include_jdate=True for Jalali.</li>
            <li>adjust=True before any return calculation.</li>
            <li>{TOOLS.length} tools cover the public pytse-client surface.</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
