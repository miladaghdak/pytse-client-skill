import { TOOLS } from "@/lib/catalog";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  return Response.json({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.summary,
      inputSchema: t.inputSchema,
    })),
  });
}
