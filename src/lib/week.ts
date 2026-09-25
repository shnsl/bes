export const PRAYERS = ["sabah", "ogle", "ikindi", "aksam", "yatsi"] as const;

export type PrayerId = (typeof PRAYERS)[number];

export type DayPrayers = Record<PrayerId, boolean>;

export const PRAYER_LABELS: Record<PrayerId, string> = {
  sabah: "Sabah",
  ogle: "Öğle",
  ikindi: "İkindi",
  aksam: "Akşam",
  yatsi: "Yatsı",
};

export const DAY_LABELS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

export const WEEK_TOTAL = 35;

export function isDayComplete(day: DayPrayers | undefined): boolean {
  if (!day) return false;
  return PRAYERS.every((prayer) => day[prayer]);
}

export function emptyDay(): DayPrayers {
  return { sabah: false, ogle: false, ikindi: false, aksam: false, yatsi: false };
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = start.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  start.setDate(start.getDate() + diff);
  return start;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function weekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isFutureDay(date: Date, today = new Date()): boolean {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return day > now;
}

export function canGoToNextWeek(weekStart: Date, today = new Date()): boolean {
  return startOfWeek(weekStart).getTime() < startOfWeek(today).getTime();
}

export function weekRangeLabel(weekStart: Date, today = new Date()): string {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const range = sameMonth
    ? `${weekStart.getDate()}–${end.getDate()} ${MONTHS[weekStart.getMonth()]}`
    : `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]}`;
  const showYear = weekStart.getFullYear() !== today.getFullYear() || end.getFullYear() !== today.getFullYear();
  return showYear ? `${range} ${end.getFullYear()}` : range;
}

export function countDone(days: Record<string, DayPrayers>, keys: string[]): number {
  return keys.reduce((sum, key) => {
    const day = days[key];
    if (!day) return sum;
    return sum + PRAYERS.filter((prayer) => day[prayer]).length;
  }, 0);
}

export function normalizeDay(value: Partial<DayPrayers> | undefined): DayPrayers {
  const day = emptyDay();
  if (!value) return day;
  for (const prayer of PRAYERS) {
    if (typeof value[prayer] === "boolean") day[prayer] = value[prayer];
  }
  return day;
}
