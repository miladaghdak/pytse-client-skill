import { eq } from "drizzle-orm";
import { db } from "@/db";
import { skillTools } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";
import { getSkill } from "@/lib/skill";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const skill = await getSkill();
  const tools = await db
    .select()
    .from(skillTools)
    .where(eq(skillTools.skillId, skill.id))
    .orderBy(skillTools.sortOrder);
  return Response.json({
    skill: skill.name,
    tools: tools.map((t) => ({
      name: t.name,
      category: t.category,
      description: t.summary,
      pythonApi: t.pythonApi,
      script: t.script,
      inputSchema: t.inputSchema,
      outputHint: t.outputHint,
      example: t.example,
      pitfalls: t.pitfalls,
    })),
  });
}
