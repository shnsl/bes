import type { PrayerId } from "./week";
import { addDays, formatDateKey, PRAYERS } from "./week";

/** Diyanet'te Şahinbey ayrı ilçe değil; Gaziantep merkez (Şahinbey dahil) */
export const SAHINBEY_DISTRICT_ID = "9479";
export const PRAYER_TIMES_LABEL = "Gaziantep · Şahinbey";

const API_BASE = "https://ezanvakti.imsakiyem.com/api/prayer-times";
const CACHE_PREFIX = "bes-vakit-9479-v2";

export type DayTimes = Record<PrayerId, string> & {
  /** Güneş doğuşu (kerahat için) */
  gunes: string;
};

export type WeekPrayerData = {
  times: Record<string, DayTimes>;
  hijri: Record<string, string>;
};

export type UpcomingPrayer = {
  prayer: PrayerId;
  minutes: number;
};

const HIJRI_MONTHS = [
  "",
  "Muharrem",
  "Safer",
  "Rebiülevvel",
  "Rebiülahir",
  "Cemaziyelevvel",
  "Cemaziyelahir",
  "Recep",
  "Şaban",
  "Ramazan",
  "Şevval",
  "Zilkade",
  "Zilhicce",
] as const;

type ApiDay = {
  date: string;
  times: {
    imsak: string;
    gunes: string;
    ogle: string;
    ikindi: string;
    aksam: string;
    yatsi: string;
  };
  hijri_date?: {
    day?: number;
    month?: number;
    month_name?: string;
    year?: number;
    full_date?: string;
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
    gunes: normalizeClock(times.gunes),
    ogle: normalizeClock(times.ogle),
    ikindi: normalizeClock(times.ikindi),
    aksam: normalizeClock(times.aksam),
    yatsi: normalizeClock(times.yatsi),
  };
}

function formatHijriLabel(hijri: ApiDay["hijri_date"]): string | null {
  if (!hijri) return null;
  const day = hijri.day;
  const year = hijri.year;
  const month =
    typeof hijri.month === "number" && hijri.month >= 1 && hijri.month <= 12
      ? HIJRI_MONTHS[hijri.month]
      : hijri.month_name;
  if (!day || !month || !year) return hijri.full_date?.trim() || null;
  return `${day} ${month} ${year}`;
}

function dateKeyFromApi(dateIso: string): string {
  return dateIso.slice(0, 10);
}

function cacheKey(weekStartKey: string): string {
  return `${CACHE_PREFIX}:${weekStartKey}`;
}

function readCache(weekStartKey: string): WeekPrayerData | null {
  try {
    const raw = localStorage.getItem(cacheKey(weekStartKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeekPrayerData | Record<string, DayTimes>;
    if (parsed && typeof parsed === "object" && "times" in parsed) {
      return parsed as WeekPrayerData;
    }
    // Eski yalnızca-vakit önbelleği
    return { times: parsed as Record<string, DayTimes>, hijri: {} };
  } catch {
    return null;
  }
}

function writeCache(weekStartKey: string, data: WeekPrayerData) {
  try {
    localStorage.setItem(cacheKey(weekStartKey), JSON.stringify(data));
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

const OGLE_KERAHAT_MIN = 20;
const AKSAM_KERAHAT_MIN = 45;
const GUNES_KERAHAT_MIN = 45;

/**
 * Kerahat (namaz kılınmayan) dilimleri:
 * 1) Güneş doğuşundan sonraki 45 dk
 * 2) Öğleden 20 dk önce → öğle
 * 3) Akşamdan 45 dk önce → akşam
 */
export function isKerahatNow(times: DayTimes | undefined, now = new Date()): boolean {
  if (!times?.gunes || !times.ogle || !times.aksam) return false;

  const gunes = clockToDate(now, times.gunes);
  const ogle = clockToDate(now, times.ogle);
  const aksam = clockToDate(now, times.aksam);
  if (!gunes || !ogle || !aksam) return false;

  const t = now.getTime();

  const gunesEnd = gunes.getTime() + GUNES_KERAHAT_MIN * 60_000;
  if (t >= gunes.getTime() && t < gunesEnd) return true;

  const ogleStart = ogle.getTime() - OGLE_KERAHAT_MIN * 60_000;
  if (t >= ogleStart && t < ogle.getTime()) return true;

  const aksamStart = aksam.getTime() - AKSAM_KERAHAT_MIN * 60_000;
  if (t >= aksamStart && t < aksam.getTime()) return true;

  return false;
}

/**
 * Sabah: güneş (sabah kerahati girişi) kalan dk
 * İkindi: akşamdan 45 dk önceki kerahat girişi kalan dk
 * Yalnızca ilgili vakit girdikten sonra, kerahat başlamadan önce.
 */
export function getKerahatEntryMinutes(
  prayer: PrayerId,
  times: DayTimes | undefined,
  now = new Date(),
): number | null {
  if (!times) return null;

  if (prayer === "sabah") {
    if (!hasPrayerStarted(now, "sabah", times, now)) return null;
    const gunes = clockToDate(now, times.gunes);
    if (!gunes) return null;
    const diffMs = gunes.getTime() - now.getTime();
    if (diffMs <= 0) return null;
    return Math.max(1, Math.ceil(diffMs / 60_000));
  }

  if (prayer === "ikindi") {
    if (!hasPrayerStarted(now, "ikindi", times, now)) return null;
    const aksam = clockToDate(now, times.aksam);
    if (!aksam) return null;
    const entryMs = aksam.getTime() - AKSAM_KERAHAT_MIN * 60_000;
    const diffMs = entryMs - now.getTime();
    if (diffMs <= 0) return null;
    return Math.max(1, Math.ceil(diffMs / 60_000));
  }

  return null;
}

export async function fetchWeekPrayerTimes(weekStart: Date): Promise<WeekPrayerData> {
  const weekStartKey = formatDateKey(weekStart);
  const cached = readCache(weekStartKey);
  const url = `${API_BASE}/${SAHINBEY_DISTRICT_ID}/weekly?startDate=${weekStartKey}`;

  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`vakit ${response.status}`);
    const payload = (await response.json()) as ApiResponse;
    if (!payload.data?.length) throw new Error("vakit boş");

    const times: Record<string, DayTimes> = {};
    const hijri: Record<string, string> = {};
    for (const day of payload.data) {
      const key = dateKeyFromApi(day.date);
      times[key] = toDayTimes(day.times);
      const label = formatHijriLabel(day.hijri_date);
      if (label) hijri[key] = label;
    }

    for (let i = 0; i < 7; i += 1) {
      const key = formatDateKey(addDays(weekStart, i));
      if (!times[key] && cached?.times[key]) times[key] = cached.times[key];
      if (!hijri[key] && cached?.hijri[key]) hijri[key] = cached.hijri[key];
    }

    const next = { times, hijri };
    writeCache(weekStartKey, next);
    return next;
  } catch {
    if (cached) return cached;
    throw new Error("Ezan vakitleri alınamadı");
  }
}

/** Bugünün hicri tarihi (ör. 11 Şaban 1444) */
export async function fetchTodayHijriLabel(now = new Date()): Promise<string | null> {
  const todayKey = formatDateKey(now);
  const url = `${API_BASE}/${SAHINBEY_DISTRICT_ID}/daily?startDate=${todayKey}`;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`hicri ${response.status}`);
    const payload = (await response.json()) as ApiResponse;
    const day = payload.data?.find((item) => dateKeyFromApi(item.date) === todayKey) ?? payload.data?.[0];
    return formatHijriLabel(day?.hijri_date);
  } catch {
    return null;
  }
}
