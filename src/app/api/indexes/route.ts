import { db } from "@/db";
import { financialIndexes, indexBars } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const rows = await db.select().from(financialIndexes);
  const payload = [];
  for (const row of rows) {
    const bars = await db.select().from(indexBars).where(eq(indexBars.indexId, row.id));
    payload.push({ ...row, history: bars });
  }
  return Response.json({ demo: true, source: "skill-studio-demo", indexes: payload });
}
