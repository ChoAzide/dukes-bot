import type { BotConfig, TaskDefinition, TaskInstance } from "./types.js";
import { isoWeekNumber, isoWeekday, assignedClerkUserIdForDay } from "./rotation.js";

export function periodKeyForWeek(date: Date): string {
  const week = isoWeekNumber(date);
  const year = date.getUTCFullYear();
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function periodKeyForMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function isWeekday(date: Date): boolean {
  const d = isoWeekday(date);
  return d >= 1 && d <= 5;
}

export function shouldCreateDailyTasks(config: BotConfig, date: Date, isHoliday: boolean): boolean {
  if (config.reminder.weekdaysOnly && !isWeekday(date)) return false;
  if (config.holiday.skipDailyOnHolidays && isHoliday) return false;
  return true;
}

export function dailyTaskDefinitions(config: BotConfig): TaskDefinition[] {
  return config.tasks.filter((t) => t.active && t.cadence === "daily");
}

export function weeklyTaskDefinitions(config: BotConfig): TaskDefinition[] {
  return config.tasks.filter((t) => t.active && t.cadence === "weekly");
}

export function monthlyTaskDefinitions(config: BotConfig): TaskDefinition[] {
  return config.tasks.filter((t) => t.active && t.cadence === "monthly");
}

export function buildDailyTaskInstances(config: BotConfig, date: Date): TaskInstance[] {
  const dueDate = date.toISOString().slice(0, 10);
  const assignee = assignedClerkUserIdForDay(config.rotation, date);
  const periodKey = periodKeyForWeek(date);
  return dailyTaskDefinitions(config).map((t) => ({
    id: `${periodKey}:${dueDate}:${t.id}:${assignee}`,
    taskDefinitionId: t.id,
    periodKey,
    dueDate,
    assignedToUserId: assignee,
    status: "open"
  }));
}

export function buildWeeklyTaskInstances(config: BotConfig, weekDate: Date): TaskInstance[] {
  const assignee = assignedClerkUserIdForDay(config.rotation, weekDate);
  const periodKey = periodKeyForWeek(weekDate);
  return weeklyTaskDefinitions(config).map((t) => ({
    id: `${periodKey}:${t.id}:${assignee}`,
    taskDefinitionId: t.id,
    periodKey,
    assignedToUserId: assignee,
    status: "open"
  }));
}

