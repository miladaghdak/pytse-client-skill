import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, IBM_Plex_Mono, Vazirmatn } from "next/font/google";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

const fa = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-fa",
});

const FALLBACK_SITE_URL = "http://localhost:3000";

// Applied before first paint so the toggle never shows a stale state. The
// cookie is the source of truth — it is what the server reads when it decides
// whether to fetch live TSETMC data — with localStorage as the fallback for
// the very first visit, before any cookie has been written. next.config.ts
// ships security headers but no CSP, so an inline script is allowed here.
const DEMO_BOOT =
  'try{document.documentElement.dataset.demo=document.cookie.indexOf("demo-mode=off")>-1||localStorage.getItem("pytse-client-skill:demo-mode")==="off"?"off":"on"}catch(e){document.documentElement.dataset.demo="on"}';

// `??` is not enough here. A platform that materialises an env var declared with
// an empty value hands us "" rather than undefined, and `new URL("")` throws —
// which fails the production build during page-data collection. Trim, treat
// empty as absent, and fall back on a malformed value too, so a typo in a
// dashboard can never take the deploy down with it.
function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return FALLBACK_SITE_URL;
  try {
    return new URL(raw).toString();
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export const metadata: Metadata = {
  metadataBase: new URL(resolveSiteUrl()),
  title: {
    default: "pytse-client Skill Studio",
    template: "%s · pytse-client Skill Studio",
  },
  description:
    "Agent Skill wrapping Glyphack/pytse-client: historical OHLCV, realtime boards, order books, حقیقی/حقوقی flow, shareholders, and شاخص کل for AI agents.",
  authors: [{ name: "Milad Aghdak", url: "https://github.com/MiladAghdak" }],
  openGraph: {
    title: "pytse-client Skill Studio",
    description:
      "The complete Agent Skills package for بورس تهران. SKILL.md, 16 tools, scripts, and an interactive playground on synthetic data.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} ${fa.variable}`}>
      <body className="min-h-screen antialiased">
        <script dangerouslySetInnerHTML={{ __html: DEMO_BOOT }} />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
