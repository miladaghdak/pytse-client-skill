"use client";

import { useMemo, useState } from "react";
import type { ToolDef } from "@/lib/catalog";

/** ISO date N calendar days before today — the corpus covers ~90 trading days back. */
function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function Playground({
  tools,
  symbols,
  initialTool,
}: {
  tools: ToolDef[];
  symbols: string[];
  initialTool?: string;
}) {
  const [toolName, setToolName] = useState(initialTool ?? tools[0]?.name ?? "ticker_snapshot");
  const tool = useMemo(
    () => tools.find((t) => t.name === toolName) ?? tools[0],
    [tools, toolName],
  );
  const [symbol, setSymbol] = useState(symbols[0] ?? "فولاد");
  const [adjust, setAdjust] = useState(false);
  const [start, setStart] = useState(daysAgo(60));
  const [end, setEnd] = useState(daysAgo(0));
  const [timeframe, setTimeframe] = useState("1m");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("// invoke a tool to see JSON");
  const [meta, setMeta] = useState<string>("idle");

  const needsSymbol = Boolean(tool?.inputSchema.properties.symbol);
  const needsDates = Boolean(
    tool?.inputSchema.properties.start_date || tool?.name.includes("financial"),
  );
  const needsTf = Boolean(tool?.inputSchema.properties.timeframe);

  async function run() {
    if (!tool) return;
    setBusy(true);
    const input: Record<string, unknown> = {};
    if (needsSymbol) input.symbol = symbol;
    if (tool.inputSchema.properties.adjust) input.adjust = adjust;
    if (tool.inputSchema.properties.include_jdate) input.include_jdate = true;
    if (tool.inputSchema.properties.start_date) {
      input.start_date = start;
      input.end_date = end;
    }
    if (needsTf) input.timeframe = timeframe;
    if (tool.name === "download_financial_indexes" || tool.name === "financial_index_snapshot") {
      input.symbol = symbol.startsWith("شاخص") ? symbol : "شاخص کل";
    }
    try {
      const res = await fetch("/api/tools/invoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: tool.name, input, agent: "Skill Studio Playground" }),
      });
      const json = await res.json();
      setMeta(`${json.ok ? "ok" : "err"} · ${json.latency_ms ?? "?"}ms · ${tool.name}`);
      setResult(JSON.stringify(json, null, 2));
    } catch (err) {
      setMeta("network error");
      setResult(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="panel p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">Tool</p>
        <select
          value={toolName}
          onChange={(e) => setToolName(e.target.value)}
          className="mt-3 w-full border border-[rgba(243,236,220,0.16)] bg-ink px-3 py-2 font-mono text-xs text-paper outline-none"
        >
          {tools.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
        {tool ? (
          <p className="mt-3 text-sm leading-relaxed text-paper-dim">{tool.summary}</p>
        ) : null}
        {needsSymbol ? (
          <label className="mt-5 block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-dim">
              Symbol
            </span>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="mt-2 w-full border border-[rgba(243,236,220,0.16)] bg-ink px-3 py-2 font-fa text-sm text-paper outline-none"
            >
              {symbols.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value="شاخص کل">شاخص کل</option>
              <option value="شاخص کل هم وزن">شاخص کل هم وزن</option>
            </select>
          </label>
        ) : null}
        {tool?.inputSchema.properties.adjust ? (
          <label className="mt-4 flex items-center gap-2 font-mono text-xs text-paper-dim">
            <input
              type="checkbox"
              checked={adjust}
              onChange={(e) => setAdjust(e.target.checked)}
            />
            adjust=True
          </label>
        ) : null}
        {needsDates && tool?.inputSchema.properties.start_date ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-dim">
                Start
              </span>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="mt-2 w-full border border-[rgba(243,236,220,0.16)] bg-ink px-2 py-2 font-mono text-xs text-paper outline-none"
              />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-dim">
                End
              </span>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-2 w-full border border-[rgba(243,236,220,0.16)] bg-ink px-2 py-2 font-mono text-xs text-paper outline-none"
              />
            </label>
          </div>
        ) : null}
        {needsTf ? (
          <label className="mt-4 block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-paper-dim">
              Timeframe
            </span>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="mt-2 w-full border border-[rgba(243,236,220,0.16)] bg-ink px-3 py-2 font-mono text-xs text-paper outline-none"
            >
              {["30s", "1m", "5m", "10m", "15m", "30m", "1h"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="mt-6 w-full bg-gold py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink disabled:opacity-60"
        >
          {busy ? "Invoking…" : "Invoke tool"}
        </button>
        {tool ? (
          <pre className="mt-5 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-gold-2">
            {tool.pythonApi}
          </pre>
        ) : null}
      </aside>
      <section className="panel min-h-[480px] p-5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">Response</p>
            <span className="border border-gold/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
              Demo data
            </span>
          </span>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper-dim">{meta}</p>
        </div>
        <pre className="mt-4 max-h-[640px] overflow-auto font-mono text-[11px] leading-relaxed text-paper">
          {result}
        </pre>
      </section>
    </div>
  );
}
