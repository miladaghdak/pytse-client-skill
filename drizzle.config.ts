import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js loads `.env.local` on its own, but drizzle-kit runs outside Next and
// plain `dotenv/config` only reads `.env` — so `pnpm db:push` would miss a
// `.env.local` and fail with "DATABASE_URL is required". Load both. dotenv
// never overwrites a variable that is already set, so a real DATABASE_URL from
// CI or Vercel still wins, and `.env.local` takes precedence over `.env` locally.
config({ path: ".env.local" });
config();

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required — copy .env.example to .env.local first");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
