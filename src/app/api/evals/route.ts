import { db } from "@/db";
import { evalCases } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const rows = await db.select().from(evalCases);
  return Response.json({ cases: rows });
}
