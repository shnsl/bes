import { emptyDay, normalizeDay, PRAYERS, type DayPrayers, type PrayerId } from "./week";

const MIRROR_PREFIX = "bes-days-mirror";
const LEGACY_KEY = "bes-days";

function mirrorKey(uid: string): string {
  return `${MIRROR_PREFIX}:${uid}`;
}

export function readDayMirror(uid: string): Record<string, DayPrayers> {
  try {
    const raw = localStorage.getItem(mirrorKey(uid));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<DayPrayers>>;
    const store: Record<string, DayPrayers> = {};
    for (const [key, value] of Object.entries(parsed)) {
      store[key] = normalizeDay(value);
    }
    return store;
  } catch {
    return {};
  }
}

export function writeDayMirror(uid: string, store: Record<string, DayPrayers>) {
  try {
    localStorage.setItem(mirrorKey(uid), JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function upsertDayMirror(uid: string, dateKey: string, day: DayPrayers) {
  const store = readDayMirror(uid);
  store[dateKey] = normalizeDay(day);
  writeDayMirror(uid, store);
}

/** Eski localStorage anahtarını (bes-days) okuyup aynaya kat. */
export function readLegacyDays(): Record<string, DayPrayers> {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<DayPrayers>>;
    const store: Record<string, DayPrayers> = {};
    for (const [key, value] of Object.entries(parsed)) {
      store[key] = normalizeDay(value);
    }
    return store;
  } catch {
    return {};
  }
}

/**
 * İşaretler yapışkan: true olan taraf kazanır (pending hariç).
 * Böylece web önbelleğindeki işaretler localhost/sunucu birleşiminde kaybolmaz.
 */
export function mergeDayPrayers(
  remote: DayPrayers | undefined,
  local: DayPrayers | undefined,
  pending: Partial<Record<PrayerId, boolean>> | undefined,
): DayPrayers {
  const next = emptyDay();
  for (const prayer of PRAYERS) {
    if (pending && prayer in pending) {
      next[prayer] = Boolean(pending[prayer]);
      continue;
    }
    next[prayer] = remote?.[prayer] === true || local?.[prayer] === true;
  }
  return next;
}

export function dayHasMark(day: DayPrayers | undefined): boolean {
  if (!day) return false;
  return PRAYERS.some((prayer) => day[prayer] === true);
}
