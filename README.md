# pytse-client-skill

An **agent skill** that gives coding agents first-class Tehran Stock Exchange (بورس تهران) data capabilities: Persian ticker symbols, historical OHLCV with split-adjusted prices, realtime boards, five-level order books, tick data, حقیقی/حقوقی (retail vs institutional) flow, major shareholders, financial indexes (شاخص‌ها), and فیلترنویسی stats.

The skill wraps [Glyphack/pytse-client](https://github.com/Glyphack/pytse-client) **v0.19.1** (GPL-3.0) and is packaged in the Agent Skills layout: a `SKILL.md` entry point, deep-dive `references/`, ready-to-run `scripts/`, and `assets/tools.json`. **Skill Studio** — a Next.js app in the same repo — documents the skill, hosts a synthetic-data playground and evals, and serves the skill over HTTP.

## What's in the repo

| Path | What it is |
| --- | --- |
| `public/skills/pytse-client/` | **The skill** — `SKILL.md`, `references/`, `scripts/`, `assets/tools.json` |
| `src/` | **Skill Studio** — Next.js 16 App Router app (docs, playground, evals, install guide) |
| `drizzle.config.ts` | drizzle-kit config (reads `DATABASE_URL`) |
| `docs/VERIFICATION.md` | Fact-check and completeness-audit methodology and results |
| `DEPLOY.md` | Free deployment guide (Vercel Hobby + Neon Postgres) |

## Install the skill

```bash
git clone https://github.com/MiladAghdak/pytse-client-skill.git
pip install pytse-client
```

Copy the skill directory wherever your host reads skills:

```bash
# Claude Code — personal
cp -r pytse-client-skill/public/skills/pytse-client ~/.claude/skills/pytse-client

# Claude Code — project-scoped
cp -r pytse-client-skill/public/skills/pytse-client .claude/skills/pytse-client
```

Cursor, Codex, and other hosts: copy `public/skills/pytse-client/` into your host's skills directory — the format is plain markdown plus scripts.

Verify the runtime offline (no network needed):

```bash
python pytse-client-skill/public/skills/pytse-client/scripts/smoke.py
```

## Skill Studio (the web app)

Browse the full skill docs and copy install commands. A **demo switch in the header** picks the data source, and it changes what every surface actually returns:

- **Demo on** — the studio serves its deterministic synthetic corpus; every tool response carries `demo: true`, so agent rehearsals are reproducible and never touch the exchange.
- **Demo off** — the Next.js server itself calls the real TSETMC endpoints (the same URLs and parsing `pytse-client` uses), so the site shows live prices, candles, order books, حقیقی/حقوقی flow, and shareholders with nothing installed — no Python, no skill download. Tool responses carry `source: "live-tsetmc"` and `demo: false`.

The switch is a server-side cookie, so live mode is correct on first paint. Where the live exchange cannot answer exactly the way the Python client does, the UI says so in place instead of showing a fabricated number.

### Run locally

```bash
pnpm install
cp .env.example .env.local   # point DATABASE_URL at any Postgres
pnpm db:push                 # create the schema (one time)
pnpm dev                     # http://localhost:3000
```

### Deploy free

The whole stack runs on free tiers — see [DEPLOY.md](./DEPLOY.md).

## Verification

Every signature, column list, endpoint URL, and exception message in the skill was cross-checked against the pinned upstream v0.19.1 source, and every bundled script was audited for correct serialization and error handling. The studio was also exercised against a live Neon Postgres: schema pushed, 2,630 demo rows seeded, and every table read back through Drizzle. Live mode was then verified against the real exchange — a market board, 4,232 daily bars, and the invoke API, with each history field cross-checked field-by-field against the exchange's own board for the same session. Methodology and results: [docs/VERIFICATION.md](./docs/VERIFICATION.md), which also records what live mode deliberately leaves out and why.

## Licenses

- **App code** (`src/`, the studio): **MIT** — see [LICENSE](./LICENSE), © 2026 Milad Aghdak.
- **The skill** (`public/skills/pytse-client/`): **GPL-3.0** — it documents and wraps the GPL-3.0 [pytse-client](https://github.com/Glyphack/pytse-client) upstream; see [`public/skills/pytse-client/LICENSE`](./public/skills/pytse-client/LICENSE).

## Credits

- [Glyphack/pytse-client](https://github.com/Glyphack/pytse-client) — the upstream library and its contributors (GPL-3.0).
- Skill and Skill Studio by [Milad Aghdak](https://github.com/MiladAghdak).
