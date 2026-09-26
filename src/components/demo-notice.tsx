import Link from "next/link";

/**
 * Shown only when a live TSETMC fetch fails, so the visitor sees exactly which
 * surface could not be reached and why. The rest of the page keeps its real
 * data — this is a per-section fallback, not a wall.
 */
export function LiveFallback({
  context,
  reason,
}: {
  context: string;
  reason: string;
}) {
  return (
    <div data-live-fallback className="panel p-6 sm:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-rose">
        Live data unavailable
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper-dim">
        {context} could not be fetched from TSETMC: {reason}
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper-dim">
        The exchange is often slow or unreachable outside Iranian market hours.
        Every other section on this page is showing real data, and the same
        figure is available in the synthetic corpus by switching demo mode back
        on.
      </p>
      <div className="mt-5 flex flex-wrap gap-3 font-mono text-[11px] uppercase tracking-[0.16em]">
        <Link
          className="border border-line px-3 py-1.5 text-paper-dim transition hover:border-gold/50 hover:text-paper"
          href="/docs"
        >
          Read the docs
        </Link>
        <a
          className="border border-line px-3 py-1.5 text-paper-dim transition hover:border-gold/50 hover:text-paper"
          href="https://old.tsetmc.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open TSETMC
        </a>
      </div>
    </div>
  );
}
