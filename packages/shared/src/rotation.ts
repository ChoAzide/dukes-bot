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
  return [assignedClerkUserIdForDay(config, date)];
}

export function assignedClerkUserIdForDay(config: RotationConfig, date: Date): string {
  if (isSharedWeek(config, date)) {
    const weekday = isoWeekday(date);
    return config.sharedWeekRule.weekdayAssignment[weekday];
  }

  // Single-clerk weeks rotate in roster order, but "shared weeks" do not advance the rotation.
  // This matches the provided history pattern:
  // - week(minSharedWeek)-1 => roster[0]
  // - shared weeks are excluded from the ordinal count
  const sharedWeeks = config.sharedWeekRule.weekNumbers;
  if (sharedWeeks.length === 0) {
    // Fallback: simple modulo if no shared weeks configured.
    const week = isoWeekNumber(date);
    return config.roster[week % config.roster.length]!.userId;
  }

  const firstShared = Math.min(...sharedWeeks);
  const baseSingleWeek = firstShared - 1; // roster[0] starts at the week before the first shared week
  const week = isoWeekNumber(date);

  if (week < baseSingleWeek) {
    // Out of expected range; fallback to modulo.
    return config.roster[week % config.roster.length]!.userId;
  }

  let ordinalNonShared = 0;
  for (let w = baseSingleWeek; w <= week; w++) {
    if (sharedWeeks.includes(w)) continue;
    ordinalNonShared++;
  }

  const rosterIndex = ordinalNonShared - 1;
  return config.roster[rosterIndex % config.roster.length]!.userId;
}

