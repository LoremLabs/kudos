import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as schema from "../../schema.js";
import { PostgresStorage } from "../../postgres-storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "..", "..", "..", "drizzle");

export async function createTestStorage(opts?: {
  outbox?: boolean;
}): Promise<PostgresStorage> {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder });
  return new PostgresStorage(db as any, {
    outbox: opts?.outbox,
    closeFn: async () => {
      await pglite.close();
    },
  });
}
