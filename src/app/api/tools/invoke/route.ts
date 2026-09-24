import { invokeTool } from "@/lib/invoke";
import {
  clientKey,
  isRateLimited,
  logInvocation,
  pickString,
  readJsonBody,
  resolveAgentId,
} from "@/lib/invoke-log";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (isRateLimited(clientKey(request))) {
    return Response.json(
      { ok: false, error: "rate limit exceeded" },
      { status: 429 },
    );
  }
  await ensureSeeded();
  const body = await readJsonBody(request);
  if (!body) {
    return Response.json(
      { ok: false, error: "a JSON object body of at most 8KB is required" },
      { status: 400 },
    );
  }
  const tool = pickString(body.tool) ?? pickString(body.name);
  if (!tool) {
    return Response.json({ ok: false, error: "tool is required" }, { status: 400 });
  }
  const input = body.input ?? body.arguments ?? {};

  const started = Date.now();
  const result = await invokeTool(tool, input);
  const latency = Date.now() - started;

  const invocationId = await logInvocation({
    agentId: await resolveAgentId(body.agent),
    toolName: tool,
    input,
    output: result.data ?? null,
    ok: result.ok,
    error: result.error ?? null,
    latencyMs: latency,
  });

  return Response.json({
    ...result,
    latency_ms: latency,
    invocation_id: invocationId,
  });
}
