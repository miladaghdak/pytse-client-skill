import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { skillFiles } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";
import { getSkill } from "@/lib/skill";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "SKILL.md" };

const TIERS = [
  {
    n: "01",
    title: "Catalog",
    cost: "~100 tokens",
    body: "name + description loaded for every installed skill at session start. This is the entire trigger surface.",
  },
  {
    n: "02",
    title: "Instructions",
    cost: "< 5k tokens",
    body: "Full SKILL.md body — decision tree, hard rules, script index. Loaded only when the task is Iranian-market.",
  },
  {
    n: "03",
    title: "Resources",
    cost: "on demand",
    body: "references/*.md and scripts/*.py. The agent reads a file only when the decision tree names it.",
  },
];

export default async function SkillPage() {
  await ensureSeeded();
  const skill = await getSkill();
  const files = await db.select().from(skillFiles).where(eq(skillFiles.skillId, skill.id));

  return (
    <main className="mx-auto max-w-7xl px-5 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">agentskills.io spec</p>
      <h1 className="mt-3 font-display text-5xl text-paper md:text-6xl">SKILL.md</h1>
      <p className="mt-4 max-w-3xl text-paper-dim">{skill.description}</p>
      <div className="mt-6 flex flex-wrap gap-3 font-mono text-[11px] uppercase tracking-[0.16em]">
        <span className="border border-gold/40 px-3 py-1 text-gold">{skill.license}</span>
        <span className="border border-paper/20 px-3 py-1 text-paper-dim">v{skill.version}</span>
        <span className="border border-paper/20 px-3 py-1 text-paper-dim">
          upstream {skill.sourceVersion}
        </span>
        <a href="/api/skill/md" className="border border-gold/40 px-3 py-1 text-gold">
          Raw markdown
        </a>
        <Link href="/install" className="bg-gold px-3 py-1 text-ink">
          Install
        </Link>
      </div>

      <section className="mt-14 grid gap-4 md:grid-cols-3">
        {TIERS.map((t) => (
          <article key={t.n} className="panel p-6">
            <p className="font-mono text-[10px] text-gold">
              {t.n} · {t.cost}
            </p>
            <h2 className="mt-3 font-display text-3xl text-paper">{t.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-paper-dim">{t.body}</p>
          </article>
        ))}
      </section>

      <section className="mt-16 grid gap-8 lg:grid-cols-[1fr_320px]">
        <article className="panel p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">Body</p>
          <pre className="mt-4 max-h-[720px] overflow-auto whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-paper">
            {skill.body}
          </pre>
        </article>
        <aside>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">Bundle</p>
          <ul className="mt-4 space-y-2">
            {files.map((f) => (
              <li key={f.path}>
                <a
                  href={`/skills/pytse-client/${f.path}`}
                  className="panel block p-3 transition hover:border-gold/40"
                >
                  <p className="font-mono text-[11px] text-paper">{f.path}</p>
                  <p className="mt-1 text-xs text-paper-dim">{f.summary}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-gold">
                    {f.kind} · {f.loadWhen}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </main>
  );
}
