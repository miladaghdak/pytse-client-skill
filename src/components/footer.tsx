import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[rgba(243,236,220,0.1)] px-5 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-display text-2xl text-paper">pytse-client Skill Studio</p>
          <p className="mt-2 max-w-xl text-sm text-paper-dim">
            An Agent Skills package wrapping{" "}
            <a className="text-gold underline-offset-4 hover:underline" href="https://github.com/Glyphack/pytse-client">
              Glyphack/pytse-client
            </a>{" "}
            for Tehran Stock Exchange. Upstream license GPLv3. Studio corpus is educational.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em] text-paper-dim">
          <Link href="/skill">SKILL.md</Link>
          <Link href="/api/skill">Catalog JSON</Link>
          <Link href="/api/health">Health</Link>
          <a href="https://agentskills.io/specification">agentskills.io</a>
          <a href="https://discord.gg/ampPDKHpVv">Discord</a>
        </div>
      </div>
    </footer>
  );
}
