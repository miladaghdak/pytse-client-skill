import { db } from "@/db";
import { tickers } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const rows = await db.select().from(tickers);
  return Response.json({
    demo: true,
    source: "skill-studio-demo",
    count: rows.length,
    tickers: rows.map((r) => ({
      symbol: r.symbol,
      index: r.indexCode,
      title: r.title,
      group: r.groupName,
      flow: r.flow,
      state: r.state,
      last_price: r.lastPrice,
      adj_close: r.adjClose,
      yesterday_price: r.yesterdayPrice,
      volume: r.volume,
      pe: r.peRatio,
      eps: r.eps,
      float_shares: r.floatShares,
      market_cap: r.marketCap,
    })),
  });
}
