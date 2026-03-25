import { auditTable } from "./tables.js";

type AuditEntity = {
  partitionKey: string; // userId
  rowKey: string; // e.g. reminder:2026-03-17
  updatedAt: string;
};

export async function isDailyReminderSent(userId: string, dueYmd: string): Promise<boolean> {
  const table = auditTable();
  try {
    await table.getEntity<AuditEntity>(userId, `reminder:${dueYmd}`);
    return true;
  } catch (e: any) {
    if (e?.statusCode === 404) return false;
    throw e;
  }
}

export async function markDailyReminderSent(userId: string, dueYmd: string): Promise<void> {
  const table = auditTable();
  const now = new Date().toISOString();
  const entity: AuditEntity = {
    partitionKey: userId,
    rowKey: `reminder:${dueYmd}`,
    updatedAt: now
  };
  await table.upsertEntity(entity, "Replace");
}

export async function isWrapupSent(periodKey: string): Promise<boolean> {
  const table = auditTable();
  try {
    await table.getEntity<AuditEntity>("wrapup", `period:${periodKey}`);
    return true;
  } catch (e: any) {
    if (e?.statusCode === 404) return false;
    throw e;
  }
}

export async function markWrapupSent(periodKey: string): Promise<void> {
  const table = auditTable();
  const now = new Date().toISOString();
  const entity: AuditEntity = {
    partitionKey: "wrapup",
    rowKey: `period:${periodKey}`,
    updatedAt: now
  };
  await table.upsertEntity(entity, "Replace");
}

