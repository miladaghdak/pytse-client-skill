import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  agents,
  clientTypeDays,
  evalCases,
  financialIndexes,
  indexBars,
  shareholders,
  skillFiles,
  skills,
  skillTools,
  tickerBars,
  tickers,
} from "@/db/schema";
import { EVAL_CASES, SKILL_FILES, SKILL_META, TOOLS } from "@/lib/catalog";
import { INDEX_SEEDS, INSTRUMENTS, type OrderLevel } from "@/lib/instruments";
import { formatJdate } from "@/lib/jalali";
import { hashString, iso, mulberry32, pickTradingDays } from "@/lib/rng";
import { SKILL_BODY } from "@/lib/skill-body";

let seedPromise: Promise<void> | null = null;

function book(last: number, rand: () => number): {
  buy: OrderLevel[];
  sell: OrderLevel[];
} {
  const buy: OrderLevel[] = [];
  const sell: OrderLevel[] = [];
  for (let i = 0; i < 5; i += 1) {
    const step = Math.max(1, Math.round(last * 0.0015 * (i + 1)));
    buy.push({
      count: 4 + Math.floor(rand() * 40),
      volume: Math.round((20_000 + rand() * 180_000) / (i + 1)),
      price: last - step,
    });
    sell.push({
      count: 3 + Math.floor(rand() * 36),
      volume: Math.round((18_000 + rand() * 160_000) / (i + 1)),
      price: last + step,
    });
  }
  return { buy, sell };
}

async function seedInternal(): Promise<void> {
  await db.transaction(async (tx) => {
    // Serialize concurrent cold starts: the second instance re-checks and exits.
    await tx.execute(sql`select pg_advisory_xact_lock(727272)`);
    const existing = await tx.select({ id: skills.id }).from(skills).limit(1);
    if (existing.length > 0) return;

    const [skill] = await tx
      .insert(skills)
      .values({
        slug: SKILL_META.slug,
        name: SKILL_META.name,
        description: SKILL_META.description,
        version: SKILL_META.version,
        license: SKILL_META.license,
        compatibility: SKILL_META.compatibility,
        author: SKILL_META.author,
        authorUrl: SKILL_META.authorUrl,
        language: SKILL_META.language,
        sourceRepo: SKILL_META.sourceRepo,
        sourceVersion: SKILL_META.sourceVersion,
        allowedTools: SKILL_META.allowedTools,
        body: SKILL_BODY,
      })
      .returning();

    if (!skill) throw new Error("failed to insert skill");

    await tx.insert(skillFiles).values(
      SKILL_FILES.map((f) => ({
        skillId: skill.id,
        path: f.path,
        kind: f.kind,
        title: f.title,
        summary: f.summary,
        loadWhen: f.loadWhen,
      })),
    );

    await tx.insert(skillTools).values(
      TOOLS.map((t) => ({
        skillId: skill.id,
        name: t.name,
        category: t.category,
        summary: t.summary,
        pythonApi: t.pythonApi,
        script: t.script,
        inputSchema: t.inputSchema,
        outputHint: t.outputHint,
        example: t.example,
        pitfalls: t.pitfalls,
        sortOrder: t.sortOrder,
      })),
    );

    await tx.insert(evalCases).values(EVAL_CASES);
    await tx.insert(agents).values([
      { name: "Skill Studio Playground", platform: "web" },
      { name: "Claude Code", platform: "claude-code" },
      { name: "Cursor", platform: "cursor" },
      { name: "OpenAI Codex", platform: "codex" },
    ]);

    const days = pickTradingDays(90);

    for (const inst of INSTRUMENTS) {
      const rand = mulberry32(hashString(inst.symbol));
      const { buy, sell } = book(inst.lastPrice, rand);
      const openPrice = Math.round(inst.yesterdayPrice * (1 + (rand() - 0.45) * 0.012));
      const highPrice = Math.max(inst.lastPrice, openPrice) + Math.round(inst.lastPrice * 0.012);
      const lowPrice = Math.min(inst.lastPrice, openPrice) - Math.round(inst.lastPrice * 0.011);
      const tradeCount = 800 + Math.floor(rand() * 9000);
      const volume = Math.round(inst.monthAverageVolume * (0.55 + rand() * 0.9));
      const adjClose = Math.round((inst.lastPrice * 3 + inst.yesterdayPrice) / 4);
      const value = volume * adjClose;
      const band = inst.lastPrice * 0.05;

      const [row] = await tx
        .insert(tickers)
        .values({
          symbol: inst.symbol,
          indexCode: inst.indexCode,
          isin: inst.isin,
          title: inst.title,
          fullTitle: inst.fullTitle,
          groupName: inst.groupName,
          groupNumber: inst.groupNumber,
          flow: inst.flow,
          flowCode: inst.flowCode,
          state: inst.state,
          fiscalYear: inst.fiscalYear,
          eps: inst.eps,
          peRatio: inst.peRatio,
          groupPeRatio: inst.groupPeRatio,
          psr: inst.psr,
          psRatio: inst.psRatio,
          nav: inst.nav,
          navDate: inst.navDate,
          baseVolume: inst.baseVolume,
          lastPrice: inst.lastPrice,
          adjClose,
          yesterdayPrice: inst.yesterdayPrice,
          openPrice,
          highPrice,
          lowPrice,
          tradeCount,
          volume,
          value,
          lastDate: `${iso(days[days.length - 1])} 12:29:54`,
          staMax: Math.round(inst.yesterdayPrice + band),
          staMin: Math.round(inst.yesterdayPrice - band),
          minWeek: Math.round(inst.lastPrice * 0.96),
          maxWeek: Math.round(inst.lastPrice * 1.04),
          minYear: inst.minYear,
          maxYear: inst.maxYear,
          monthAverageVolume: inst.monthAverageVolume,
          floatShares: inst.floatShares,
          totalShares: inst.totalShares,
          marketCap: inst.totalShares * adjClose,
          bestSupplyPrice: sell[0].price,
          bestSupplyVol: sell[0].volume,
          bestDemandPrice: buy[0].price,
          bestDemandVol: buy[0].volume,
          buyOrders: buy,
          sellOrders: sell,
          individualBuyCount: 800 + Math.floor(rand() * 20000),
          individualBuyVol: Math.round(volume * (0.55 + rand() * 0.25)),
          individualSellCount: 700 + Math.floor(rand() * 18000),
          individualSellVol: Math.round(volume * (0.45 + rand() * 0.25)),
          corporateBuyCount: 2 + Math.floor(rand() * 40),
          corporateBuyVol: Math.round(volume * (0.15 + rand() * 0.2)),
          corporateSellCount: 2 + Math.floor(rand() * 38),
          corporateSellVol: Math.round(volume * (0.12 + rand() * 0.22)),
          tsetmcUrl: `http://old.tsetmc.com/Loader.aspx?ParTree=151311&i=${inst.indexCode}`,
        })
        .returning();

      if (!row) throw new Error(`failed to insert ticker ${inst.symbol}`);

      let px = inst.lastPrice / (1 + (rand() - 0.5) * 0.25);
      const barRows = [];
      const flowRows = [];
      for (const day of days) {
        const ret = (rand() - 0.48) * 0.028;
        const o = px;
        const c = Math.max(1, px * (1 + ret));
        const h = Math.max(o, c) * (1 + rand() * 0.012);
        const l = Math.min(o, c) * (1 - rand() * 0.012);
        const vol = Math.round(inst.monthAverageVolume * (0.35 + rand() * 1.4));
        const cnt = 200 + Math.floor(rand() * 8000);
        const date = iso(day);
        barRows.push({
          tickerId: row.id,
          date,
          jdate: formatJdate(date),
          open: Math.round(o * 10) / 10,
          high: Math.round(h * 10) / 10,
          low: Math.round(l * 10) / 10,
          close: Math.round(c * 10) / 10,
          adjClose: Math.round(c * 10) / 10,
          yesterday: Math.round(px * 10) / 10,
          volume: vol,
          count: cnt,
          value: vol * c,
        });
        const price = c;
        const ibv = Math.round(vol * (0.4 + rand() * 0.4));
        const cbv = vol - ibv;
        const isv = Math.round(vol * (0.35 + rand() * 0.4));
        const csv = Math.max(0, vol - isv);
        flowRows.push({
          tickerId: row.id,
          date,
          individualBuyCount: 80 + Math.floor(rand() * 20000),
          corporateBuyCount: 1 + Math.floor(rand() * 40),
          individualSellCount: 70 + Math.floor(rand() * 18000),
          corporateSellCount: 1 + Math.floor(rand() * 36),
          individualBuyVol: ibv,
          corporateBuyVol: cbv,
          individualSellVol: isv,
          corporateSellVol: csv,
          individualBuyValue: ibv * price,
          corporateBuyValue: cbv * price,
          individualSellValue: isv * price,
          corporateSellValue: csv * price,
          individualOwnershipChange: ibv - isv,
        });
        px = c;
      }
      await tx.insert(tickerBars).values(barRows);
      await tx.insert(clientTypeDays).values(flowRows);

      const holderRows = inst.holders.map((h, i) => {
        const shares = Math.round((h.percentage / 100) * inst.totalShares);
        return {
          tickerId: row.id,
          shareholderId: h.id,
          name: h.name,
          shares,
          percentage: h.percentage,
          change: i === 0 ? 1 : 0,
        };
      });
      await tx.insert(shareholders).values(holderRows);
    }

    for (const idx of INDEX_SEEDS) {
      const rand = mulberry32(hashString(idx.symbol));
      const [row] = await tx
        .insert(financialIndexes)
        .values({
          symbol: idx.symbol,
          indexCode: idx.indexCode,
          lastValue: idx.lastValue,
          lastUpdate: `12:29 · seed ${iso(days[days.length - 1])}`,
          high: Math.round(idx.lastValue * 1.008),
          low: Math.round(idx.lastValue * 0.993),
        })
        .returning();

      if (!row) throw new Error(`failed to insert index ${idx.symbol}`);

      let v = idx.lastValue / 1.12;
      const bars = days.map((day) => {
        const ret = (rand() - 0.47) * 0.018;
        const o = v;
        const c = v * (1 + ret);
        const h = Math.max(o, c) * (1 + rand() * 0.006);
        const l = Math.min(o, c) * (1 - rand() * 0.006);
        v = c;
        const date = iso(day);
        return {
          indexId: row.id,
          date,
          jdate: formatJdate(date),
          open: Math.round(o),
          high: Math.round(h),
          low: Math.round(l),
          close: Math.round(c),
          volume: idx.vol * (0.6 + rand() * 0.8),
        };
      });
      await tx.insert(indexBars).values(bars);
    }
  });
}

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedInternal().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  await seedPromise;
}
