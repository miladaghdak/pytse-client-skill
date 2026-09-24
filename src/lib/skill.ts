import { eq } from "drizzle-orm";
import { db } from "@/db";
import { skills } from "@/db/schema";
import { SKILL_META } from "@/lib/catalog";

export async function getSkill() {
  const [skill] = await db.select().from(skills).where(eq(skills.slug, SKILL_META.slug)).limit(1);
  if (!skill) {
    throw new Error("pytse-client skill is not seeded");
  }
  return skill;
}
