import { readFile } from "node:fs/promises";
import path from "node:path";
import { ensureSeeded } from "@/lib/seed";
import { getSkill } from "@/lib/skill";

export const dynamic = "force-dynamic";

// Serve the exact SKILL.md that ships in public/ — the same file agents copy
// from the install page — so the download and the site can never diverge.
const SKILL_MD_PATH = path.join(
  process.cwd(),
  "public",
  "skills",
  "pytse-client",
  "SKILL.md",
);

// Fallback reconstruction from the database, used only when the bundled
// SKILL.md is not readable at runtime. JSON.stringify produces quoted YAML
// scalars, which keeps Persian text and colons safe.
function renderFromDb(skill: Awaited<ReturnType<typeof getSkill>>): string {
  return `---
name: ${JSON.stringify(skill.name)}
description: ${JSON.stringify(skill.description)}
license: ${JSON.stringify(skill.license)}
compatibility: ${JSON.stringify(skill.compatibility)}
metadata:
  author: ${JSON.stringify(skill.author)}
  author_url: ${JSON.stringify(skill.authorUrl)}
  source_repo: ${JSON.stringify(skill.sourceRepo)}
  source_version: ${JSON.stringify(skill.sourceVersion)}
  skill_version: ${JSON.stringify(skill.version)}
  language: ${JSON.stringify(skill.language)}
allowed-tools: ${skill.allowedTools}
---

${skill.body}
`;
}

export async function GET() {
  await ensureSeeded();
  const file = await readFile(SKILL_MD_PATH, "utf8").catch(() => null);
  const md = file ?? renderFromDb(await getSkill());
  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'inline; filename="SKILL.md"',
    },
  });
}
