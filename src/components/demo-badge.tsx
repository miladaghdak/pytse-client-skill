/**
 * Labels any surface that renders the studio's deterministic synthetic corpus.
 * Every market-data surface in the app must carry this badge so no visitor or
 * agent mistakes demo data for live TSETMC quotes.
 */
export function DemoBadge() {
  return (
    <span className="border border-gold/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
      Demo data
    </span>
  );
}
