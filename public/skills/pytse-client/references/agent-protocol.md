# Agent protocol (hosted Skill Studio)

Progressive disclosure for HTTP hosts:

1. Session start: `GET /api/skill` → `{ name, description, version, files, tools[] }` (~100 tokens of name+description per skill).
2. Activation: `GET /skills/pytse-client/SKILL.md` (static) or `GET /api/skill/md`.
3. Resources: fetch only the `references/*.md` or `scripts/*.py` the decision tree names.
4. Execution: either run a bundled script, or `POST /api/tools/invoke`.

## Invoke

```http
POST /api/tools/invoke
Content-Type: application/json

{
  "tool": "ticker_snapshot",
  "input": { "symbol": "فولاد" },
  "agent": "claude-code"
}
```

Response:

```json
{
  "ok": true,
  "tool": "ticker_snapshot",
  "source": "skill-studio-demo",
  "demo": true,
  "latency_ms": 12,
  "invocation_id": 42,
  "data": { }
}
```

Every response carries the honesty envelope: `"source": "skill-studio-demo"` and `"demo": true` — the studio serves **synthetic demo data only**, never live TSETMC quotes. Success adds `data`; failure gives `ok=false` with `error` and an optional `hint` pointing at `references/pitfalls.md`; both add `latency_ms` and `invocation_id` (id of the logged invocation row).

## MCP-shaped list

`GET /api/mcp/tools` returns `{ tools: [{ name, description, inputSchema }] }`.

`POST /api/mcp/call` accepts `{ name, arguments }` and returns the same envelope as `/api/tools/invoke` (including `latency_ms` and `invocation_id`).

## Well-known

`GET /api/skill` is the catalog entry. `GET /api/health` liveness (includes DB).

## Studio vs live TSETMC

The hosted playground uses a seeded corpus of major TSE names so agents can practice without burning TSETMC. Bundled Python scripts talk to the real exchange. Never mix the two in one answer without saying which source you used.
