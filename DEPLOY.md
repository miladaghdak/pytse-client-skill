# Deploying Skill Studio for free

The whole stack fits on free tiers: **Vercel Hobby** for hosting/serverless and **Neon Postgres** for the database. Neither requires a credit card.

## 1. Push the repo to GitHub

Create `github.com/MiladAghdak/pytse-client-skill` (or your fork) and push.

## 2. Create a free Neon database

1. Sign up at [neon.tech](https://neon.tech) and create a project.
2. Copy the **pooled** connection string — the host ends in `-pooler` and the URL carries `?sslmode=require`. The pooled route is the right pattern for serverless connections, and Neon's free tier autosuspends idle compute without breaking anything.

## 3. Create the schema (one time, from your machine)

```bash
pnpm install
DATABASE_URL="<your neon pooled url>" pnpm db:push
```

`ensureSeeded()` inserts rows but never creates tables — this push is required exactly once.

## 4. Deploy on Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
2. Environment variable: `DATABASE_URL` = the Neon pooled URL (add it to Production and Preview).
3. Optional: `NEXT_PUBLIC_SITE_URL` = the production URL (used for OpenGraph metadata).
4. Deploy — Vercel auto-detects Next.js and runs `pnpm build`.

Seeding runs automatically on the first request, guarded by a Postgres advisory lock (`pg_advisory_xact_lock`) so concurrent cold starts cannot double-seed.

## Notes

- **Neon free tier**: 0.5 GB storage; idle compute autosuspends (the first request after a pause pays roughly 500 ms of cold start).
- **Vercel Hobby**: ample for a demo; the app is serverless-friendly (per-instance connection pool; coarse in-memory rate limiting on the public POST endpoints as defense-in-depth).
- All studio data is synthetic — nothing to back up, no secrets at rest.
