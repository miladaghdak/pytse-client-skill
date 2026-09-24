import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-5 py-20 text-center">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">404</p>
        <h1 className="mt-3 font-display text-5xl text-paper">Symbol halted.</h1>
        <p className="mt-4 text-paper-dim">This route is not in the skill bundle.</p>
        <Link
          href="/"
          className="mt-8 inline-block bg-gold px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink"
        >
          Back to the desk
        </Link>
      </div>
    </main>
  );
}
