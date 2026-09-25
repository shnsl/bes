import type { PrayerId } from "./week";
import { addDays, formatDateKey, PRAYERS } from "./week";

/** Diyanet'te Şahinbey ayrı ilçe değil; Gaziantep merkez (Şahinbey dahil) */
export const SAHINBEY_DISTRICT_ID = "9479";
export const PRAYER_TIMES_LABEL = "Gaziantep · Şahinbey";

const API_BASE = "https://ezanvakti.imsakiyem.com/api/prayer-times";
const CACHE_PREFIX = "bes-vakit-9479";

export type DayTimes = Record<PrayerId, string>;

export type UpcomingPrayer = {
  prayer: PrayerId;
  minutes: number;
};

type ApiDay = {
  date: string;
  times: {
    imsak: string;
    ogle: string;
    ikindi: string;
    aksam: string;
    yatsi: string;
  };
};

type ApiResponse = {
  success?: boolean;
  data?: ApiDay[];
};

function normalizeClock(value: string): string {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value.trim();
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function toDayTimes(times: ApiDay["times"]): DayTimes {
  return {
    sabah: normalizeClock(times.imsak),
    ogle: normalizeClock(times.ogle),
    ikindi: normalizeClock(times.ikindi),
    aksam: normalizeClock(times.aksam),
    yatsi: normalizeClock(times.yatsi),
  };
}

function dateKeyFromApi(dateIso: string): string {
  return dateIso.slice(0, 10);
}

function cacheKey(weekStartKey: string): string {
  return `${CACHE_PREFIX}:${weekStartKey}`;
}

function readCache(weekStartKey: string): Record<string, DayTimes> | null {
  try {
    const raw = localStorage.getItem(cacheKey(weekStartKey));
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, DayTimes>;
  } catch {
    return null;
  }
}

function writeCache(weekStartKey: string, times: Record<string, DayTimes>) {
  try {
    localStorage.setItem(cacheKey(weekStartKey), JSON.stringify(times));
  } catch {
    /* quota */
  }
}

function clockToDate(day: Date, clock: string): Date | null {
  const match = clock.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Number(match[1]), Number(match[2]), 0, 0);
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Vakit girildiyse (veya geçmiş günse) işaretlenebilir */
export function hasPrayerStarted(
  day: Date,
  prayer: PrayerId,
  times: DayTimes | undefined,
  now = new Date(),
): boolean {
  const dayMs = startOfLocalDay(day);
  const todayMs = startOfLocalDay(now);
  if (dayMs < todayMs) return true;
  if (dayMs > todayMs) return false;
  const clock = times?.[prayer];
  if (!clock) return false;
  const at = clockToDate(day, clock);
  if (!at) return false;
  return now.getTime() >= at.getTime();
}

/** Bugünün henüz gelmemiş ilk vakti ve kalan dakika */
export function getUpcomingPrayer(times: DayTimes | undefined, now = new Date()): UpcomingPrayer | null {
  if (!times) return null;
  const nowMs = now.getTime();
  for (const prayer of PRAYERS) {
    const at = clockToDate(now, times[prayer]);
    if (!at) continue;
    const diffMs = at.getTime() - nowMs;
    if (diffMs > 0) {
      return { prayer, minutes: Math.max(1, Math.ceil(diffMs / 60_000)) };
    }
  }
  return null;
}

export async function fetchWeekPrayerTimes(weekStart: Date): Promise<Record<string, DayTimes>> {
  const weekStartKey = formatDateKey(weekStart);
  const cached = readCache(weekStartKey);
  const url = `${API_BASE}/${SAHINBEY_DISTRICT_ID}/weekly?startDate=${weekStartKey}`;

  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`vakit ${response.status}`);
    const payload = (await response.json()) as ApiResponse;
    if (!payload.data?.length) throw new Error("vakit boş");

    const next: Record<string, DayTimes> = {};
    for (const day of payload.data) {
      next[dateKeyFromApi(day.date)] = toDayTimes(day.times);
    }

    for (let i = 0; i < 7; i += 1) {
      const key = formatDateKey(addDays(weekStart, i));
      if (!next[key] && cached?.[key]) next[key] = cached[key];
    }

    writeCache(weekStartKey, next);
    return next;
  } catch {
    if (cached) return cached;
    throw new Error("Ezan vakitleri alınamadı");
  }
}
