import { eq } from "drizzle-orm";
import { db } from "@/db";
import { skillFiles, skillTools } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";
import { getSkill } from "@/lib/skill";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const skill = await getSkill();
  const files = await db.select().from(skillFiles).where(eq(skillFiles.skillId, skill.id));
  const tools = await db
    .select()
    .from(skillTools)
    .where(eq(skillTools.skillId, skill.id))
    .orderBy(skillTools.sortOrder);
  return Response.json({
    name: skill.name,
    description: skill.description,
    version: skill.version,
    license: skill.license,
    compatibility: skill.compatibility,
    sourceRepo: skill.sourceRepo,
    sourceVersion: skill.sourceVersion,
    allowedTools: skill.allowedTools,
    files: files.map((f) => ({
      path: f.path,
      kind: f.kind,
      title: f.title,
      summary: f.summary,
      loadWhen: f.loadWhen,
      url: `/skills/pytse-client/${f.path}`,
    })),
    tools: tools.map((t) => ({
      name: t.name,
      category: t.category,
      summary: t.summary,
      pythonApi: t.pythonApi,
      script: t.script,
    })),
  });
}
