import Link from "next/link";

const LINKS = [
  { href: "/skill", label: "Skill" },
  { href: "/tools", label: "Tools" },
  { href: "/playground", label: "Playground" },
  { href: "/tickers", label: "Universe" },
  { href: "/docs", label: "Docs" },
  { href: "/install", label: "Install" },
  { href: "/console", label: "Console" },
  { href: "/evals", label: "Evals" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(243,236,220,0.1)] bg-[rgba(7,9,12,0.78)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-3">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center border border-gold/50 text-gold">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M12 2 L14.2 8.8 H21 L15.6 13.1 L17.8 20 L12 15.8 L6.2 20 L8.4 13.1 L3 8.8 H9.8 Z" />
            </svg>
          </span>
          <span className="leading-none">
            <span className="block font-mono text-[10px] uppercase tracking-[0.28em] text-gold">Agent Skill</span>
            <span className="font-display text-lg tracking-tight text-paper">pytse-client</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-5 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-paper-dim transition hover:text-gold"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/install"
          className="hidden border border-gold/70 bg-gold px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink sm:inline-block"
        >
          Install skill
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto border-t border-[rgba(243,236,220,0.08)] px-5 py-2 md:hidden">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-paper-dim"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
