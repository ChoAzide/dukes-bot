import { getISOWeek, getISODay } from "date-fns";
import type { RotationConfig, Weekday } from "./types.js";

export function isoWeekNumber(date: Date): number {
  return getISOWeek(date);
}

export function isoWeekday(date: Date): Weekday {
  return getISODay(date) as Weekday;
}

export function isSharedWeek(config: RotationConfig, date: Date): boolean {
  const week = isoWeekNumber(date);
  return config.sharedWeekRule.enabled && config.sharedWeekRule.weekNumbers.includes(week);
}

export function assignedClerkUserIdsForDate(config: RotationConfig, date: Date): string[] {
  if (isSharedWeek(config, date)) return config.sharedWeekRule.users.map((u) => u.userId);
  const week = isoWeekNumber(date);
  const idx = week % config.roster.length;
  return [config.roster[idx]!.userId];
}

export function assignedClerkUserIdForDay(config: RotationConfig, date: Date): string {
  if (isSharedWeek(config, date)) {
    const weekday = isoWeekday(date);
    return config.sharedWeekRule.weekdayAssignment[weekday];
  }
  const week = isoWeekNumber(date);
  const idx = week % config.roster.length;
  return config.roster[idx]!.userId;
}

