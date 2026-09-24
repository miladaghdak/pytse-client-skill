# Verification report

Verification of the pytse-client skill and Skill Studio against upstream
[Glyphack/pytse-client](https://github.com/Glyphack/pytse-client) **v0.19.1**.

All checks below were run against the installed package and its source tree, not
against documentation or memory. Where a claim could not be checked by execution,
it is listed as unverified rather than assumed correct.

## 1. Build and static checks

| Check | Command | Result |
| --- | --- | --- |
| Production build | `pnpm build` | **pass** — compiled in ~47s, TypeScript clean, page data collected, 24 routes emitted |
| Lint | `pnpm lint` | **pass** — no findings |
| Offline runtime self-test | `scripts/smoke.py` | **pass** — `pytse-client 0.19.1`, pandas 3.0.6, jdatetime 3.8.2, bs4 4.15.0, lxml 4.9.4, 1394 symbols, 55 indices |
| Symbol resolution | `symbols_data.get_ticker_index("فولاد")` | **pass** — `46348559193224090` |
| Live database | `pnpm db:push` + `ensureSeeded()` against Neon | **pass** — 12 tables, 2,631 rows; see section 8 |

The build emits no workspace-root warning. `next.config.ts` pins
`turbopack.root`, because Turbopack otherwise adopts a parent directory that
happens to contain a lockfile and pulls foreign files into module resolution.

The build result above was reproduced twice with `exit 0`, including a full
`Collecting page data` and `Generating static pages` pass with all 24 routes
emitted. On runs without outbound access the same command fails in the font
fetch step only — see the last item in section 7. No code-level build defect
remains.

### Defect fixed during verification: build-time database requirement

`src/db/index.ts` threw `DATABASE_URL is required` at module scope. `next build`
imports every route and page module while collecting page data — including
`force-dynamic` routes that never execute — so `next build` failed on any machine
without a database, and `Failed to collect page data for /api/evals` was the
first symptom.

The pool and the Drizzle client are now built on first use behind a proxy, so
nothing reads `DATABASE_URL` at import time. A request that actually queries the
database still gets the actionable error naming the variable and pointing at
`DEPLOY.md`. The `db` and `pool` export surface is unchanged, so no call site
changed.

## 2. Completeness test

Method: parse every upstream module with `ast` (no import, no network), collect
each module-level public function and class plus every public method, then search
the skill's `SKILL.md`, all `references/*.md`, all `scripts/*.py`, and
`assets/tools.json` for each name.

- **60 / 60 public methods of all 10 public classes are documented.**
- **All reference files are linked from `SKILL.md`** — no orphans.
- **Everything `SKILL.md` references exists on disk** — no missing files.
- 10 public classes: `Ticker`, `FinancialIndex`, `RealtimeTickerInfo`,
  `MarketSymbol`, `Order`, and the internal DTOs.

Names present upstream but absent from the skill are internal, and were checked
individually rather than waved through:

- `pytse_client/utils/*`, `scraper/*`, `orderbook/common.py`,
  `ticker/api_extractors.py`, `ticker_statisticals/utils.py` — private helpers
  reached through the public API.
- `examples/` — runnable samples, not library surface.
- `proxy/tsetmc.py` (`get_day_shareholders_history`, `get_day_ticker_info_history`)
  — the `proxy/` directory has no `__init__.py`, is absent from the upstream
  README, and is not re-exported at package level.
- `download_ticker_client_types_record` — internal, called only by `Ticker`
  internals at `ticker/ticker.py:385`.

## 3. Fact test

| Claim | Verified value | How |
| --- | --- | --- |
| `RealtimeTickerInfo` has 23 fields | 23 | AST field count in `ticker/ticker.py` |
| Order book `MAX_DEPTH` is 5 | 5 | `orderbook/common.py:9` |
| 22 endpoint constants | 22 | constants at `tse_settings.py:1-77` |
| Financial-index names use **Arabic** kaf U+0643 | confirmed | runtime scan of `financial_indexes_information()`: Arabic kaf present, **zero** Persian-kaf variants |
| `شاخص كل (هم وزن)` includes parentheses | confirmed | present in the runtime index map |
| `<OPEN>` holds yesterday's close, not the day's open | documented | `translations.py` tag map; `open` comes from `<FIRST>` |
| `SKILL.md` body is byte-identical to `SKILL_BODY` | identical, 5,118 chars | byte comparison against `src/lib/skill-body.ts` |

Two claims initially looked like defects and were **not** — the checks were
wrong, not the docs. `MAX_DEPTH` lives in `orderbook/common.py`, not
`config.py`; and the 22 endpoint constants are not all named `*_URL` (14 are),
which a name-filtered count reported incorrectly.

## 4. Demo seed data cross-check

The studio's synthetic dataset had never been checked against the package's real
symbol and index maps. Both were cross-checked at runtime against
`symbols_information()` and `financial_indexes_information()`, which surfaced
**16 factual errors** now corrected in `src/lib/instruments.ts`:

- 4 index seeds: Arabic kaf and the missing parentheses in the equal-weight
  name, plus 2 wrong `indexCode` values.
- 8 equity records with wrong `indexCode` and/or `isin`, including فولاد
  (`35425587644337450` → `46348559193224090`), خساپا, فارس, شستا (off by one
  digit), وغدیر, اهرم, شپنا, and نوری.

All 12 equities and 4 indexes now verify clean. The independent `فولاد` result
from `smoke.py` above confirms the correction at runtime.

## 5. Provenance and attribution

- **No third-party model-provider traces.** A case-insensitive sweep across the
  whole tree for the originating tool's vendor names, product names, and model
  identifiers returns no match in any source, documentation, configuration, or
  lockfile entry. The one apparent hit was a coincidental byte sequence inside a
  base64 SHA-512 integrity hash in `pnpm-lock.yaml`, which is dependency
  checksum data and not a reference. This report deliberately names none of
  those terms, so that the sweep stays clean when re-run.
- **Authorship** reads Milad Aghdak / `github.com/MiladAghdak` in
  `package.json`, `LICENSE`, `README.md`, `DEPLOY.md`, `SKILL.md` frontmatter,
  `assets/tools.json` via `src/lib/catalog.ts`, and the install page.
- **Upstream attribution is intact** and deliberately retained: Glyphack /
  pytse-client, its Discord invite, and GPL-3.0 in the README, both `LICENSE`
  files, `SKILL.md`, `assets/tools.json`, and the UI footer.

## 6. Repository hygiene

- 80 files staged; `node_modules/`, `.next/`, `.ruff_cache/`, `__pycache__/`
  and `.env` are all excluded. `.ruff_cache/` and `.pytest_cache/` were added to
  `.gitignore` during this pass.
- The environment contract holds: the code reads exactly `DATABASE_URL` and
  `NEXT_PUBLIC_SITE_URL`, and both are documented in `.env.example`.

## 7. Known limitations

- **Subagent fan-out was unavailable.** Verification agents were dispatched
  three times and each failed immediately with an HTTP 403 from the configured
  subagent model endpoint. The checks in this report were run directly instead.
  The fan-out itself is unverified.
- **No live TSETMC calls were made.** Network access is restricted on the
  verification machine, so column shapes were confirmed against source code and
  against the bundled `symbols_name.json` / `indices_name.json`, not against a
  live response.
- **No HTTP request was ever served.** The studio is verified against a live
  database (section 8) but not over HTTP: `next/font/google` could not fetch its
  font files within Next's internal timeout, so `src/app/layout.tsx` fails to
  compile and every route returns 500. This is the font limitation below, not a
  database or application defect — all 12 tables were created, seeded, and read
  back successfully through the same Drizzle client the routes use.
- **`eslint.config.mjs` retains its upstream "starter" comment.** A
  config-protection hook blocked editing that file, so it is unchanged.
- **`next build` requires network access to Google Fonts.** `src/app/layout.tsx`
  uses `next/font/google` (Vazirmatn, Fraunces, IBM Plex Mono), which downloads
  and self-hosts the font files at build time. That is deliberate: the fonts are
  then served from the app's own origin, whereas a runtime CSS `@import` would be
  blocked for many users in Iran. The trade-off is that `next build` fails on a
  machine with no usable outbound access — observed here as an intermittent
  `Failed to fetch … from Google Fonts` on the same command that had just
  succeeded, and as a consistent failure in `next dev`, where each individual
  `.woff2` took ~11 s to fetch against Next's much shorter internal timeout.
  Any hosted build (Vercel, CI) has normal network access and is unaffected. To
  build fully offline, the fonts would have to be vendored as files and loaded
  with `next/font/local`.

## 8. Live database verification

The studio was exercised against a real Neon Postgres (Free, `eu-central-1`,
pooled endpoint) after `pnpm db:push`. This is the check that the earlier
"not exercised against a live database" note called for.

| Check | Result |
| --- | --- |
| `pnpm db:push` | **pass** — 12 tables created: `agents`, `client_type_days`, `eval_cases`, `financial_indexes`, `index_bars`, `invocations`, `shareholders`, `skill_files`, `skill_tools`, `skills`, `ticker_bars`, `tickers` |
| `ensureSeeded()` over PgBouncer | **pass** — 2,631 rows written in one transaction (1,080 `ticker_bars`, 1,080 `client_type_days`, 360 `index_bars`, 39 `shareholders`, 23 `skill_files`, 16 `skill_tools`, 12 `eval_cases`, 12 `tickers`, 4 `agents`, 4 `financial_indexes`, 1 `skills`) |
| Idempotency | **pass** — a second `ensureSeeded()` was a no-op, confirming the `pg_advisory_xact_lock(727272)` guard and the existence check both hold |
| Drizzle reads through the pooler | **pass** — `db.select()` returned rows from `tickers`, `ticker_bars`, and `eval_cases` |
| Prepared statements vs. PgBouncer | **pass** — Drizzle's node-postgres driver uses named prepared statements, which is the usual failure mode against a transaction-mode pooler. Neon handles it; no `prepared statement already exists` error |

### Defect fixed during this pass: `db:push` could not see `.env.local`

`README.md` instructs `cp .env.example .env.local`, but `drizzle.config.ts`
began with `import "dotenv/config"`, and plain dotenv reads only `.env` — a
Next.js convention, not a dotenv one. drizzle-kit runs outside Next, so
`pnpm db:push` failed with `DATABASE_URL is required` on a correctly configured
checkout. The config now loads `.env.local` and then `.env`; because dotenv never
overwrites a variable that is already set, a real `DATABASE_URL` from CI or Vercel
still takes precedence.

### Operational note: seed the database before the first deploy

`ensureSeeded()` writes all 2,631 rows in a single transaction, which took
**38 s** over the link to Frankfurt. On a Vercel cold start against an empty
database that work would happen inside the request that needs it — and because
`ensureSeeded()` clears `seedPromise` and rethrows on failure, a timeout would
make every subsequent request retry the entire seed. The seeded database is
therefore part of the deploy, not an optimisation: **`pnpm db:push` must be run
and a first request allowed to complete against the production database before
the app is considered live.** This is what `DEPLOY.md` prescribes.
