"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "pytse-client-skill:demo-mode";
const CHANGE_EVENT = "pytse-client-skill:demo-mode-change";
const COOKIE = "demo-mode";

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

/**
 * The studio's one switch: synthetic corpus on, real TSETMC data off.
 *
 * The flag lives outside React — `html[data-demo]`, stamped before first
 * paint by the root layout's boot script and consumed by the stylesheets — so
 * the switch reads it as an external store and stays in sync with what CSS
 * sees.
 *
 * Flipping it writes a cookie, not just localStorage. Live mode is fetched by
 * this server inside server components and the invoke route, and TSETMC sends
 * no CORS headers, so the browser cannot fetch it itself. The cookie is what
 * the server reads; the reload is what re-renders the page against it.
 */
export function DemoToggle() {
  const demo = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.demo !== "off",
    () => true,
  );

  function apply(next: boolean) {
    document.documentElement.dataset.demo = next ? "on" : "off";
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    } catch {
      // Storage blocked (private window): the cookie below still carries the mode.
    }
    document.cookie = `${COOKIE}=${next ? "on" : "off"}; path=/; max-age=31536000; samesite=lax`;
    window.dispatchEvent(new Event(CHANGE_EVENT));
    // The server has to re-render every surface against the new mode.
    window.location.reload();
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={demo}
      aria-label={`Demo data ${demo ? "on" : "off"} — switch between the synthetic corpus and live TSETMC`}
      title={
        demo
          ? "Demo mode is on: this studio serves a synthetic corpus. Switch off for live TSETMC data fetched by this server."
          : "Live mode: this studio fetches real data from TSETMC. Switch on for the synthetic corpus."
      }
      onClick={() => apply(!demo)}
      className="group flex shrink-0 cursor-pointer items-center gap-2 border border-line px-2.5 py-1.5 transition hover:border-gold/60"
    >
      <span className="relative block h-3.5 w-7 border border-line" aria-hidden="true">
        <span
          className={`absolute left-0.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 transition-transform duration-150 ${
            demo ? "translate-x-[14px] bg-gold" : "translate-x-0 bg-teal"
          }`}
        />
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-dim group-hover:text-paper">
        Demo {demo ? "on" : "off"}
      </span>
    </button>
  );
}
