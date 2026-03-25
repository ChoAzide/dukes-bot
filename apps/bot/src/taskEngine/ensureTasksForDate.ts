import type { BotConfig, TaskInstance } from "@clerkbot/shared";
import { buildDailyTaskInstances, buildWeeklyTaskInstances, isWeekday, shouldCreateDailyTasks, periodKeyForMonth } from "@clerkbot/shared";
import { isoWeekday } from "@clerkbot/shared";
import { isDanishPublicHoliday } from "../services/holidayService.js";
import { ensureTaskInstancesExist, getAssigneeForPeriodAndTaskDefinitions, getMonthlyTaskStats } from "../storage/taskStore.js";
import { ensureTablesExist } from "../storage/ensure.js";

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeToLocalDateMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
}

function findNextWorkingDay(start: Date, config: BotConfig): Date {
  let d = normalizeToLocalDateMidnight(start);

  while (true) {
    const weekdayOk = config.reminder.weekdaysOnly ? isWeekday(d) : true;
    const holidayOk = config.holiday.skipDailyOnHolidays ? !isDanishPublicHoliday(d) : true;

    if (weekdayOk && holidayOk) return d;
    d = addDays(d, 1);
  }
}

function startOfIsoWeekMonday(d: Date): Date {
  // isoWeekday: 1=Mon ... 7=Sun
  const day = isoWeekday(d);
  return addDays(normalizeToLocalDateMidnight(d), -(day - 1));
}

export async function ensureTasksForDate(config: BotConfig, date: Date): Promise<void> {
  await ensureTablesExist();
  const day = normalizeToLocalDateMidnight(date);
  const isHoliday = config.holiday.skipDailyOnHolidays && isDanishPublicHoliday(day);

  const instances: TaskInstance[] = [];

  // 1) Daily tasks
  if (shouldCreateDailyTasks(config, day, isHoliday)) {
    instances.push(...buildDailyTaskInstances(config, day));
  }

  // 2) Weekly tasks
  const weekMonday = startOfIsoWeekMonday(day);
  const weeklyDueDate = findNextWorkingDay(weekMonday, config);
  if (toYmd(weeklyDueDate) === toYmd(day)) {
    instances.push(...buildWeeklyTaskInstances(config, weeklyDueDate));
  }

  // 3) Monthly tasks
  const firstOfMonth = new Date(day.getFullYear(), day.getMonth(), 1);
  const monthlyDueDate = findNextWorkingDay(firstOfMonth, config);
  if (toYmd(monthlyDueDate) === toYmd(day)) {
    const monthlyTaskDefs = config.tasks.filter((t) => t.active && t.cadence === "monthly");
    const monthlyTaskDefinitionIds = new Set(monthlyTaskDefs.map((t) => t.id));

    const monthKey = periodKeyForMonth(monthlyDueDate);
    const existingAssignee = await getAssigneeForPeriodAndTaskDefinitions(monthKey, monthlyTaskDefinitionIds);

    let assigneeUserId: string;
    if (existingAssignee) {
      assigneeUserId = existingAssignee;
    } else {
      const candidates = [
        ...config.rotation.roster.map((u) => u.userId),
        ...config.rotation.sharedWeekRule.users.map((u) => u.userId)
      ];

      const stats = await getMonthlyTaskStats(monthlyTaskDefinitionIds);

      // Fairness rule: pick the user with the fewest completed monthly tasks.
      // Tie-break: pick the user whose last completion is the oldest (or never completed).
      assigneeUserId = candidates[0]!;
      let bestDone = Number.POSITIVE_INFINITY;
      let bestLast = "" as string;

      for (const userId of candidates) {
        const s = stats[userId];
        const doneCount = s?.doneCount ?? 0;
        const lastDoneAt = s?.lastDoneAt ?? "";

        if (doneCount < bestDone) {
          bestDone = doneCount;
          bestLast = lastDoneAt;
          assigneeUserId = userId;
          continue;
        }

        if (doneCount === bestDone) {
          // Older lastDoneAt wins; empty lastDoneAt treated as “oldest”.
          if (!lastDoneAt && bestLast) {
            assigneeUserId = userId;
            bestLast = lastDoneAt;
            continue;
          }
          if (lastDoneAt && bestLast && lastDoneAt < bestLast) {
            assigneeUserId = userId;
            bestLast = lastDoneAt;
          }
        }
      }
    }

    const dueDate = toYmd(monthlyDueDate);
    for (const t of monthlyTaskDefs) {
      instances.push({
        id: `${monthKey}:${dueDate}:${t.id}:${assigneeUserId}`,
        taskDefinitionId: t.id,
        periodKey: monthKey,
        dueDate,
        assignedToUserId: assigneeUserId,
        status: "open"
      });
    }
  }

  if (instances.length > 0) {
    await ensureTaskInstancesExist(instances);
  }
}

