import { eq } from "drizzle-orm";
import { db } from "@/db";
import { skillFiles } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";
import { getSkill } from "@/lib/skill";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const skill = await getSkill();
  const files = await db.select().from(skillFiles).where(eq(skillFiles.skillId, skill.id));
  return Response.json({
    root: "/skills/pytse-client/",
    files: files.map((f) => ({
      path: f.path,
      kind: f.kind,
      title: f.title,
      summary: f.summary,
      loadWhen: f.loadWhen,
      url: `/skills/pytse-client/${f.path}`,
    })),
  });
}
