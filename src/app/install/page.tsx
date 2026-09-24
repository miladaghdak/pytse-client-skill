import type { Metadata } from "next";
import { SKILL_FILES } from "@/lib/catalog";

export const metadata: Metadata = { title: "Install" };

const HOSTS = [
  {
    name: "Claude Code",
    path: "~/.claude/skills/pytse-client/",
    extra: "or .claude/skills/pytse-client/ inside a repo",
  },
  {
    name: "Cursor",
    path: ".cursor/skills/pytse-client/",
    extra: "project-local; restart the agent after copy",
  },
  {
    name: "Codex / agentskills hosts",
    path: "~/.agents/skills/pytse-client/",
    extra: "directory name must match the SKILL.md name field",
  },
  {
    name: "Gemini CLI",
    path: "~/.gemini/skills/pytse-client/",
    extra: "same SKILL.md open standard",
  },
];

export default function InstallPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
        Progressive disclosure
      </p>
      <h1 className="mt-3 font-display text-5xl text-paper">Install the skill</h1>
      <p className="mt-4 max-w-2xl text-paper-dim">
        Copy the folder so the directory name is exactly <code className="text-gold">pytse-client</code>.
        Then <code className="text-gold">pip install pytse-client</code> in the runtime the agent
        executes scripts in.
      </p>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        {HOSTS.map((h) => (
          <article key={h.name} className="panel p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">{h.name}</p>
            <pre className="mt-3 overflow-x-auto font-mono text-sm text-paper">{h.path}</pre>
            <p className="mt-2 text-sm text-paper-dim">{h.extra}</p>
          </article>
        ))}
      </section>

      <section className="panel mt-10 p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">Shell</p>
        <pre className="mt-4 overflow-x-auto font-mono text-[12px] leading-relaxed text-paper">{`# 1) clone this repo
git clone https://github.com/MiladAghdak/pytse-client-skill.git
# 2) copy the skill folder into your host's skills directory
cp -r pytse-client-skill/public/skills/pytse-client ~/.claude/skills/pytse-client
# 3) install the runtime the scripts execute in
pip install pytse-client`}</pre>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-3xl text-paper">Files in the package</h2>
        <ul className="mt-5 divide-y divide-[rgba(243,236,220,0.08)] border-y border-[rgba(243,236,220,0.08)]">
          {SKILL_FILES.map((f) => (
            <li key={f.path} className="flex flex-wrap items-baseline justify-between gap-3 py-3">
              <a href={`/skills/pytse-client/${f.path}`} className="font-mono text-sm text-gold">
                {f.path}
              </a>
              <span className="text-sm text-paper-dim">{f.summary}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        <a href="/api/skill" className="panel p-5">
          <p className="font-mono text-[10px] text-gold">GET /api/skill</p>
          <p className="mt-2 text-sm text-paper-dim">Machine catalog for hosts that fetch over HTTP.</p>
        </a>
        <a href="/api/skill/md" className="panel p-5">
          <p className="font-mono text-[10px] text-gold">GET /api/skill/md</p>
          <p className="mt-2 text-sm text-paper-dim">Raw SKILL.md, regenerated from the served skill.</p>
        </a>
        <a href="/api/mcp/tools" className="panel p-5">
          <p className="font-mono text-[10px] text-gold">GET /api/mcp/tools</p>
          <p className="mt-2 text-sm text-paper-dim">MCP-shaped tool list with JSON Schema.</p>
        </a>
      </section>
    </main>
  );
}
