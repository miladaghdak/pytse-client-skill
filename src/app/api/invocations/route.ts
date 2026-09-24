import { desc } from "drizzle-orm";
import { db } from "@/db";
import { invocations } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const rows = await db.select().from(invocations).orderBy(desc(invocations.createdAt)).limit(50);
  return Response.json({ invocations: rows });
}
