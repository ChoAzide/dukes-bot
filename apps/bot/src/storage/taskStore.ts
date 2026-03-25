import type { TaskInstance } from "@clerkbot/shared";
import { taskInstancesTable } from "./tables.js";

type TaskInstanceEntity = {
  partitionKey: string; // assignedToUserId
  rowKey: string; // taskInstance id
  taskDefinitionId: string;
  periodKey: string;
  dueDate?: string;
  assignedToUserId: string;
  status: "open" | "done";
  doneAt?: string;
  doneByUserId?: string;
};

export async function getOpenTasksForUser(userId: string): Promise<TaskInstance[]> {
  const table = taskInstancesTable();
  const open: TaskInstance[] = [];

  for await (const entity of table.listEntities<TaskInstanceEntity>()) {
    if (entity.partitionKey !== userId) continue;
    if (entity.status !== "open") continue;
    open.push({
      id: entity.rowKey,
      taskDefinitionId: entity.taskDefinitionId,
      periodKey: entity.periodKey,
      dueDate: entity.dueDate,
      assignedToUserId: entity.assignedToUserId,
      status: entity.status,
      doneAt: entity.doneAt,
      doneByUserId: entity.doneByUserId
    });
  }

  // Keep ordering stable (due date first).
  open.sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  return open;
}

export async function getOpenTasksForPeriod(periodKey: string): Promise<TaskInstance[]> {
  const table = taskInstancesTable();
  const open: TaskInstance[] = [];

  for await (const entity of table.listEntities<TaskInstanceEntity>()) {
    if (entity.status !== "open") continue;
    if (entity.periodKey !== periodKey) continue;
    open.push({
      id: entity.rowKey,
      taskDefinitionId: entity.taskDefinitionId,
      periodKey: entity.periodKey,
      dueDate: entity.dueDate,
      assignedToUserId: entity.assignedToUserId,
      status: entity.status,
      doneAt: entity.doneAt,
      doneByUserId: entity.doneByUserId
    });
  }

  return open;
}

export async function getAssigneeForPeriodAndTaskDefinitions(
  periodKey: string,
  taskDefinitionIds: Set<string>
): Promise<string | null> {
  const table = taskInstancesTable();
  for await (const entity of table.listEntities<TaskInstanceEntity>()) {
    if (entity.periodKey !== periodKey) continue;
    if (!taskDefinitionIds.has(entity.taskDefinitionId)) continue;
    return entity.assignedToUserId;
  }
  return null;
}

export async function getMonthlyTaskStats(taskDefinitionIds: Set<string>): Promise<
  Record<string, { doneCount: number; lastDoneAt?: string }>
> {
  const table = taskInstancesTable();
  const stats: Record<string, { doneCount: number; lastDoneAt?: string }> = {};

  for await (const entity of table.listEntities<TaskInstanceEntity>()) {
    if (!taskDefinitionIds.has(entity.taskDefinitionId)) continue;
    if (entity.status !== "done") continue;

    const userId = entity.assignedToUserId;
    if (!stats[userId]) stats[userId] = { doneCount: 0 };
    stats[userId]!.doneCount += 1;

    if (entity.doneAt) {
      const prev = stats[userId]!.lastDoneAt;
      if (!prev || entity.doneAt > prev) stats[userId]!.lastDoneAt = entity.doneAt;
    }
  }

  return stats;
}

export async function ensureTaskInstancesExist(instances: TaskInstance[]): Promise<void> {
  const table = taskInstancesTable();
  for (const inst of instances) {
    try {
      const existing = await table.getEntity<TaskInstanceEntity>(inst.assignedToUserId, inst.id);
      // If the user already completed it, don't overwrite history.
      if (existing.status === "done") continue;
      // If it exists but is open, leave it as-is (idempotent).
      if (existing.status === "open") continue;
    } catch (e: any) {
      // Missing => create
      const entity: TaskInstanceEntity = {
        partitionKey: inst.assignedToUserId,
        rowKey: inst.id,
        taskDefinitionId: inst.taskDefinitionId,
        periodKey: inst.periodKey,
        dueDate: inst.dueDate,
        assignedToUserId: inst.assignedToUserId,
        status: inst.status,
        doneAt: inst.doneAt,
        doneByUserId: inst.doneByUserId
      };
      await table.upsertEntity(entity, "Replace");
    }
  }
}

export async function markTaskDone(taskInstanceId: string, doneByUserId: string): Promise<void> {
  const table = taskInstancesTable();

  const now = new Date().toISOString();
  try {
    const existing = await table.getEntity<TaskInstanceEntity>(doneByUserId, taskInstanceId);
    await table.upsertEntity(
      { ...existing, status: "done", doneAt: now, doneByUserId } satisfies TaskInstanceEntity,
      "Replace"
    );
  } catch (e: any) {
    // If the task doesn't exist yet, still upsert so the user gets useful feedback.
    const entity: TaskInstanceEntity = {
      partitionKey: doneByUserId,
      rowKey: taskInstanceId,
      taskDefinitionId: "unknown",
      periodKey: "unknown",
      assignedToUserId: doneByUserId,
      status: "done",
      doneAt: now,
      doneByUserId
    };
    await table.upsertEntity(entity, "Replace");
  }
}

