import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shareholders, tickerBars, tickers } from "@/db/schema";
import { invokeTool } from "@/lib/invoke";
import { normalizeFa } from "@/lib/persian";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ symbol: string }> },
) {
  await ensureSeeded();
  const { symbol } = await context.params;
  const decoded = safeDecode(symbol);
  const snapshot = await invokeTool("ticker_snapshot", { symbol: decoded });
  if (!snapshot.ok) {
    return Response.json(snapshot, { status: 404 });
  }
  const all = await db.select().from(tickers);
  const match = all.find((t) => normalizeFa(t.symbol) === normalizeFa(decoded));
  if (!match) {
    return Response.json(snapshot);
  }
  const bars = await db.select().from(tickerBars).where(eq(tickerBars.tickerId, match.id));
  const holders = await db
    .select()
    .from(shareholders)
    .where(eq(shareholders.tickerId, match.id));
  return Response.json({
    ...snapshot,
    history: bars,
    shareholders: holders,
  });
}
