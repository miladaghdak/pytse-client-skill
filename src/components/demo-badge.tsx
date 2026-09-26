/**
 * Labels any surface that renders market data with its source, so no visitor
 * or agent mistakes the synthetic corpus for a live TSETMC quote.
 */
export function DemoBadge({ live = false }: { live?: boolean }) {
  if (live) {
    return (
      <span className="live-badge border border-teal/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-teal">
        Live TSETMC
      </span>
    );
  }
  return (
    <span className="demo-badge border border-gold/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
      Demo data
    </span>
  );
}
