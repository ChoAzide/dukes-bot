import { configTable, taskInstancesTable, conversationsTable, auditTable } from "./tables.js";

export async function ensureTablesExist(): Promise<void> {
  // TableClient.createTable() is idempotent-ish: throws if exists. We'll ignore conflict.
  const clients = [configTable(), taskInstancesTable(), conversationsTable(), auditTable()];
  await Promise.all(
    clients.map(async (c) => {
      try {
        await c.createTable();
      } catch (e: any) {
        if (e?.statusCode === 409) return;
        throw e;
      }
    })
  );
}

