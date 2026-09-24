import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const skills = pgTable("skills", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  version: text("version").notNull(),
  license: text("license").notNull(),
  compatibility: text("compatibility").notNull(),
  author: text("author").notNull(),
  authorUrl: text("author_url"),
  language: text("language").notNull().default("python"),
  sourceRepo: text("source_repo").notNull(),
  sourceVersion: text("source_version").notNull(),
  allowedTools: text("allowed_tools").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const skillFiles = pgTable("skill_files", {
  id: serial("id").primaryKey(),
  skillId: integer("skill_id")
    .references(() => skills.id)
    .notNull(),
  path: text("path").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  loadWhen: text("load_when").notNull(),
});

export const skillTools = pgTable(
  "skill_tools",
  {
    id: serial("id").primaryKey(),
    skillId: integer("skill_id")
      .references(() => skills.id)
      .notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    summary: text("summary").notNull(),
    pythonApi: text("python_api").notNull(),
    script: text("script"),
    inputSchema: jsonb("input_schema").notNull(),
    outputHint: text("output_hint").notNull(),
    example: text("example").notNull(),
    pitfalls: text("pitfalls").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => [uniqueIndex("skill_tools_name_idx").on(t.name)],
);

export const tickers = pgTable(
  "tickers",
  {
    id: serial("id").primaryKey(),
    symbol: text("symbol").notNull(),
    indexCode: text("index_code").notNull(),
    isin: text("isin").notNull(),
    title: text("title").notNull(),
    fullTitle: text("full_title").notNull(),
    groupName: text("group_name").notNull(),
    groupNumber: text("group_number").notNull(),
    flow: text("flow").notNull(),
    flowCode: integer("flow_code").notNull(),
    state: text("state").notNull(),
    fiscalYear: text("fiscal_year").notNull(),
    eps: doublePrecision("eps"),
    peRatio: doublePrecision("pe_ratio"),
    groupPeRatio: doublePrecision("group_pe_ratio"),
    psr: doublePrecision("psr"),
    psRatio: doublePrecision("ps_ratio"),
    nav: doublePrecision("nav"),
    navDate: text("nav_date"),
    baseVolume: doublePrecision("base_volume").notNull(),
    lastPrice: doublePrecision("last_price").notNull(),
    adjClose: doublePrecision("adj_close").notNull(),
    yesterdayPrice: doublePrecision("yesterday_price").notNull(),
    openPrice: doublePrecision("open_price").notNull(),
    highPrice: doublePrecision("high_price").notNull(),
    lowPrice: doublePrecision("low_price").notNull(),
    tradeCount: integer("trade_count").notNull(),
    volume: doublePrecision("volume").notNull(),
    value: doublePrecision("value").notNull(),
    lastDate: text("last_date").notNull(),
    staMax: doublePrecision("sta_max").notNull(),
    staMin: doublePrecision("sta_min").notNull(),
    minWeek: doublePrecision("min_week").notNull(),
    maxWeek: doublePrecision("max_week").notNull(),
    minYear: doublePrecision("min_year").notNull(),
    maxYear: doublePrecision("max_year").notNull(),
    monthAverageVolume: doublePrecision("month_average_volume").notNull(),
    floatShares: doublePrecision("float_shares").notNull(),
    totalShares: doublePrecision("total_shares").notNull(),
    marketCap: doublePrecision("market_cap").notNull(),
    bestSupplyPrice: doublePrecision("best_supply_price").notNull(),
    bestSupplyVol: doublePrecision("best_supply_vol").notNull(),
    bestDemandPrice: doublePrecision("best_demand_price").notNull(),
    bestDemandVol: doublePrecision("best_demand_vol").notNull(),
    buyOrders: jsonb("buy_orders").notNull(),
    sellOrders: jsonb("sell_orders").notNull(),
    individualBuyCount: integer("individual_buy_count").notNull(),
    individualBuyVol: doublePrecision("individual_buy_vol").notNull(),
    individualSellCount: integer("individual_sell_count").notNull(),
    individualSellVol: doublePrecision("individual_sell_vol").notNull(),
    corporateBuyCount: integer("corporate_buy_count").notNull(),
    corporateBuyVol: doublePrecision("corporate_buy_vol").notNull(),
    corporateSellCount: integer("corporate_sell_count").notNull(),
    corporateSellVol: doublePrecision("corporate_sell_vol").notNull(),
    tsetmcUrl: text("tsetmc_url").notNull(),
  },
  (t) => [uniqueIndex("tickers_symbol_idx").on(t.symbol)],
);

export const tickerBars = pgTable(
  "ticker_bars",
  {
    id: serial("id").primaryKey(),
    tickerId: integer("ticker_id")
      .references(() => tickers.id)
      .notNull(),
    date: date("date").notNull(),
    jdate: text("jdate").notNull(),
    open: doublePrecision("open").notNull(),
    high: doublePrecision("high").notNull(),
    low: doublePrecision("low").notNull(),
    close: doublePrecision("close").notNull(),
    adjClose: doublePrecision("adj_close").notNull(),
    yesterday: doublePrecision("yesterday").notNull(),
    volume: doublePrecision("volume").notNull(),
    count: integer("count").notNull(),
    value: doublePrecision("value").notNull(),
  },
  (t) => [
    uniqueIndex("ticker_bars_unique").on(t.tickerId, t.date),
    index("ticker_bars_ticker_idx").on(t.tickerId),
  ],
);

export const clientTypeDays = pgTable(
  "client_type_days",
  {
    id: serial("id").primaryKey(),
    tickerId: integer("ticker_id")
      .references(() => tickers.id)
      .notNull(),
    date: date("date").notNull(),
    individualBuyCount: integer("individual_buy_count").notNull(),
    corporateBuyCount: integer("corporate_buy_count").notNull(),
    individualSellCount: integer("individual_sell_count").notNull(),
    corporateSellCount: integer("corporate_sell_count").notNull(),
    individualBuyVol: doublePrecision("individual_buy_vol").notNull(),
    corporateBuyVol: doublePrecision("corporate_buy_vol").notNull(),
    individualSellVol: doublePrecision("individual_sell_vol").notNull(),
    corporateSellVol: doublePrecision("corporate_sell_vol").notNull(),
    individualBuyValue: doublePrecision("individual_buy_value").notNull(),
    corporateBuyValue: doublePrecision("corporate_buy_value").notNull(),
    individualSellValue: doublePrecision("individual_sell_value").notNull(),
    corporateSellValue: doublePrecision("corporate_sell_value").notNull(),
    individualOwnershipChange: doublePrecision(
      "individual_ownership_change",
    ).notNull(),
  },
  (t) => [uniqueIndex("client_type_days_unique").on(t.tickerId, t.date)],
);

export const shareholders = pgTable("shareholders", {
  id: serial("id").primaryKey(),
  tickerId: integer("ticker_id")
    .references(() => tickers.id)
    .notNull(),
  shareholderId: text("shareholder_id").notNull(),
  name: text("name").notNull(),
  shares: doublePrecision("shares").notNull(),
  percentage: doublePrecision("percentage").notNull(),
  change: integer("change").notNull(),
});

export const financialIndexes = pgTable(
  "financial_indexes",
  {
    id: serial("id").primaryKey(),
    symbol: text("symbol").notNull(),
    indexCode: text("index_code").notNull(),
    lastValue: doublePrecision("last_value").notNull(),
    lastUpdate: text("last_update").notNull(),
    high: doublePrecision("high").notNull(),
    low: doublePrecision("low").notNull(),
  },
  (t) => [uniqueIndex("financial_indexes_symbol_idx").on(t.symbol)],
);

export const indexBars = pgTable("index_bars", {
  id: serial("id").primaryKey(),
  indexId: integer("index_id")
    .references(() => financialIndexes.id)
    .notNull(),
  date: date("date").notNull(),
  jdate: text("jdate").notNull(),
  open: doublePrecision("open").notNull(),
  high: doublePrecision("high").notNull(),
  low: doublePrecision("low").notNull(),
  close: doublePrecision("close").notNull(),
  volume: doublePrecision("volume").notNull(),
});

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  platform: text("platform").notNull(),
  contact: text("contact"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invocations = pgTable(
  "invocations",
  {
    id: serial("id").primaryKey(),
    agentId: integer("agent_id").references(() => agents.id),
    toolName: text("tool_name").notNull(),
    input: jsonb("input").notNull(),
    output: jsonb("output"),
    ok: boolean("ok").notNull(),
    error: text("error"),
    latencyMs: integer("latency_ms").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("invocations_created_idx").on(t.createdAt)],
);

export const evalCases = pgTable("eval_cases", {
  id: serial("id").primaryKey(),
  prompt: text("prompt").notNull(),
  language: text("language").notNull(),
  shouldTrigger: boolean("should_trigger").notNull(),
  expectedTool: text("expected_tool"),
  notes: text("notes").notNull(),
});
