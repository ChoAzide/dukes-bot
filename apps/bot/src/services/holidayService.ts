import Holidays from "date-holidays";

const dk = new Holidays("DK");

export function isDanishPublicHoliday(date: Date): boolean {
  // date-holidays accepts Date objects.
  // We treat any public holiday entry as a “holiday” for our scheduling purposes.
  try {
    return dk.isHoliday(date);
  } catch {
    return false;
  }
}

export function isoYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

