import { eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { agents, invocations } from "@/db/schema";

// Hard limits for the public demo endpoints.
export const MAX_BODY_BYTES = 8192;
const AGENT_NAME_MAX = 64;
const RETENTION_DAYS = 30;
const RATE_LIMIT_MAX = 30;
const RATE_WINDOW_MS = 60_000;

const rateHits = new Map<string, number[]>();

export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

// Per-instance sliding window. Each serverless instance keeps its own window,
// so this is coarse — free defense-in-depth for a public demo, not a guarantee.
export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_WINDOW_MS;
  const recent = (rateHits.get(key) ?? []).filter((t) => t > windowStart);
  if (recent.length >= RATE_LIMIT_MAX) {
    rateHits.set(key, recent);
    return true;
  }
  recent.push(now);
  rateHits.set(key, recent);
  if (rateHits.size > 5_000) {
    for (const [k, stamps] of rateHits) {
      if (stamps.every((t) => t <= windowStart)) rateHits.delete(k);
    }
  }
  return false;
}

export async function readJsonBody(
  request: Request,
): Promise<Record<string, unknown> | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return null;
  const text = await request.text().catch(() => null);
  if (text === null || Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export function pickString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export async function resolveAgentId(rawName: unknown): Promise<number | null> {
  const name = pickString(rawName)?.slice(0, AGENT_NAME_MAX) ?? "";
  if (name) {
    const existing = await db
      .select()
      .from(agents)
      .where(eq(agents.name, name))
      .limit(1);
    if (existing[0]) return existing[0].id;
    const [created] = await db
      .insert(agents)
      .values({ name, platform: "custom" })
      .returning();
    return created?.id ?? null;
  }
  const [web] = await db
    .select()
    .from(agents)
    .where(eq(agents.platform, "web"))
    .limit(1);
  return web?.id ?? null;
}

export async function logInvocation(entry: {
  agentId: number | null;
  toolName: string;
  input: unknown;
  output: unknown;
  ok: boolean;
  error: string | null;
  latencyMs: number;
}): Promise<number | null> {
  const [log] = await db
    .insert(invocations)
    .values({
      agentId: entry.agentId,
      toolName: entry.toolName,
      input: entry.input ?? {},
      output: entry.output ?? null,
      ok: entry.ok,
      error: entry.error,
      latencyMs: entry.latencyMs,
    })
    .returning();
  // Keep the demo log bounded: drop rows past the retention window.
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await db.delete(invocations).where(lt(invocations.createdAt, cutoff));
  return log?.id ?? null;
}
