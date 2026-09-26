import { cookies } from "next/headers";

/**
 * The studio's one mode switch.
 *
 * `on` (default) serves the deterministic synthetic corpus; `off` serves live
 * TSETMC data fetched by this server. The mode is a cookie because the live
 * fetches happen in server components and route handlers — the browser cannot
 * call TSETMC itself (no CORS headers on old.tsetmc.com / cdn.tsetmc.com), and
 * the SSR HTML has to be right before a single byte is painted.
 */
export const DEMO_COOKIE = "demo-mode";

export type Mode = "on" | "off";

export async function getMode(): Promise<Mode> {
  const jar = await cookies();
  return jar.get(DEMO_COOKIE)?.value === "off" ? "off" : "on";
}

/** Live mode is demo mode switched off. */
export function isLive(mode: Mode): boolean {
  return mode === "off";
}
