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
| Live database | `pnpm db:push` + `ensureSeeded()` against Neon | **pass** — 12 tables, 2,630 rows after the pass-2 catalog sync; see sections 8–9 |

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
- **Live TSETMC calls and served HTTP requests are covered in section 9.** The
  original pass could make neither, because network access and Google Fonts
  fetching were both unavailable on that machine. Both were resolved in a later
  pass: the app now builds and serves every route, and live mode was verified
  against real TSETMC responses. The font caveat below still applies to
  fully-offline builds.
- **Live history is raw, not split-adjusted.** `Export-txt.aspx` does carry a
  `yesterday` column (`<OPEN>`, which despite the tag holds the previous close)
  and an `adjClose` column (`<CLOSE>`), and this layer parses both. What is *not*
  reproduced is pytse-client's cumulative capital-increase adjustment, which is
  applied in Python on top of the raw frame. Live pages and the
  `download_history` tool say so where a reader will see it.
- **TSETMC publishes no financial-index series over HTTP.** `IndexFinancial.aspx`,
  `chart/data/IndexFinancial.aspx`, `InitIndex.aspx` and `Index.aspx` each answer
  a financial index with the TSETMC site homepage; `Export-txt.aspx` and
  `instinfofast.aspx` answer empty for an index code; and the market board carries
  no index rows. The شاخص کل line is therefore demo-only, and
  `download_financial_indexes` / `financial_index_snapshot` fail with an explicit
  message rather than a fabricated series.
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

`ensureSeeded()` writes all 2,630 rows in a single transaction, which took
**38 s** over the link to Frankfurt. On a Vercel cold start against an empty
database that work would happen inside the request that needs it — and because
`ensureSeeded()` clears `seedPromise` and rethrows on failure, a timeout would
make every subsequent request retry the entire seed. The seeded database is
therefore part of the deploy, not an optimisation: **`pnpm db:push` must be run
and a first request allowed to complete against the production database before
the app is considered live.** This is what `DEPLOY.md` prescribes.

## 9. Live-mode verification

The studio was exercised with the demo switch **off**, so every surface below was
answered by this server's own calls to TSETMC — the same URLs, user agents, and
field mappings pytse-client v0.19.1 uses. No Python and no skill install were
involved in producing any number on this page.

| Check | Result |
| --- | --- |
| Production build | **pass** — `pnpm build` compiled cleanly; TypeScript and lint both clean before it |
| `/`, `/tickers`, `/evals`, `/playground`, `/console` in both modes | **pass** — HTTP 200 in every combination, with zero `Not available right now` fallback panels |
| Live markers | **pass** — `/` and `/tickers` show `Live TSETMC` when the switch is off and show no live marker when it is on |
| `MarketWatchInit` board | **pass** — the whole board parses in one request; فولاد renders 3,250 / −2.99% / P/E 6.27 / range 3,250–3,390 / 8.20T, all cross-checked field-by-field against `instinfofast` for the same session |
| `Export-txt.aspx` daily history | **pass** — 4,232 bars for فولاد (2007-03-11 → 2026-09-26), strictly descending by date, every bar satisfying `low ≤ open,close ≤ high` |
| History field mapping | **pass** — the newest bar matches the live board on all 9 shared fields (open 3,390, high 3,390, low 3,250, close 3,250, adjClose 3,260, yesterday 3,350, count 31,636, volume 2,512,505,604, value 8,195,077,042,750) |
| `POST /api/tools/invoke` (`download_history`) | **pass** — `source: "live-tsetmc"`, `demo: false`, real index `46348559193224090`; `limit` returns the most recent N days oldest-first, matching upstream's ascending sort and the demo engine |
| Demo-mode invoke | **pass** — the same tool returns `source: "skill-studio-demo"`, `demo: true` |
| Demo switch round-trip | **pass** — off → on → off updates `aria-checked`, the `demo-mode` cookie, and `localStorage` together, and re-renders the right mode |
| Responsive layout at 375 px | **pass** — 0 px horizontal overflow on `/`, `/tickers`, `/evals`, and `/playground`, with the demo switch and GitHub link both still visible |
| Browser console | **pass** — no application errors or warnings |
| Repo attribution | **pass** — GitHub links present on every page in both modes |

### Defect fixed in this pass: the history parser was off by one column

The daily-candles panel reported `TSETMC returned no history rows` while
`Export-txt.aspx` was returning a well-formed 442 KB CSV. The parser read the date
from field 2 and the prices from fields 3–9, but TSETMC's wire layout puts the
ticker in field 0, so the date is field 1 and the OHLCV block starts one column
later — and `<LAST>` (field 11) and `<OPEN>` (field 10) were never read at all.
Every row therefore failed the `^\d{8}$` date test and the parser returned an
empty array, which surfaced as a panel-level fallback rather than as a parse
error. The mapping is now the one in upstream `translations.py` and is verified
against a live board as above.

A second, smaller defect surfaced from the same fix: `download_history` applied
`.slice(-limit)` to a newest-first array, so `limit=3` returned the three
*oldest* sessions (2007) instead of the three most recent. It now slices from the
front and reverses, matching both upstream's ascending sort and the demo engine.

### Deliberate omissions

Live mode omits a field rather than approximate it. Market cap, float, per-name
year range, split adjustment, and the شاخص کل index line are absent from live
surfaces, each with a note where a reader would otherwise expect them. This is a
design choice, not a gap: a wrong number on a market page is worse than a
labelled absence.
