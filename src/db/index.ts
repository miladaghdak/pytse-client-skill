import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as typeof globalThis & {
  __skillStudioPool?: Pool;
};

let poolInstance: Pool | undefined;
let dbInstance: Db | undefined;

function createPool(): Pool {
  if (poolInstance) return poolInstance;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required — set it before starting the server (see DEPLOY.md)",
    );
  }

  poolInstance =
    globalForDb.__skillStudioPool ??
    new Pool({
      connectionString: databaseUrl,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__skillStudioPool = poolInstance;
  }

  return poolInstance;
}

function createDb(): Db {
  if (dbInstance) return dbInstance;

  dbInstance = drizzle(createPool(), { schema });
  return dbInstance;
}

/**
 * Expose an object whose real value is built on first use.
 *
 * `next build` imports every route and page module while collecting page
 * data, even for `force-dynamic` routes that never run. Creating the pool at
 * module scope therefore fails the build on a machine with no database
 * configured, so nothing here touches `DATABASE_URL` until a request
 * actually queries it — and that request still gets the actionable error.
 */
function lazy<T extends object>(create: () => T): T {
  return new Proxy({} as T, {
    get(_target, property) {
      const instance = create() as unknown as Record<string | symbol, unknown>;
      const value = instance[property];
      return typeof value === "function" ? value.bind(instance) : value;
    },
    has(_target, property) {
      return property in (create() as object);
    },
    ownKeys() {
      return Reflect.ownKeys(create() as object);
    },
    getOwnPropertyDescriptor(_target, property) {
      const descriptor = Reflect.getOwnPropertyDescriptor(
        create() as object,
        property,
      );
      // Configurable, or the `ownKeys` trap violates Proxy invariants.
      return descriptor ? { ...descriptor, configurable: true } : undefined;
    },
  });
}

export const pool = lazy(createPool);
export const db = lazy(createDb);

/** Eager accessors, for call sites that would rather not hold a proxy. */
export const getPool = createPool;
export const getDb = createDb;
