import { emptyDay, normalizeDay, PRAYERS, type DayPrayers, type PrayerId } from "./week";

const MIRROR_PREFIX = "bes-days-mirror";
const OUTBOX_PREFIX = "bes-days-outbox";
const LEGACY_KEY = "bes-days";
const LAST_UID_KEY = "bes-last-uid";

function mirrorKey(uid: string): string {
  return `${MIRROR_PREFIX}:${uid}`;
}

function outboxKey(uid: string): string {
  return `${OUTBOX_PREFIX}:${uid}`;
}

export function rememberUid(uid: string) {
  try {
    localStorage.setItem(LAST_UID_KEY, uid);
  } catch {
    /* ignore */
  }
}

export function readLastUid(): string | null {
  try {
    return localStorage.getItem(LAST_UID_KEY);
  } catch {
    return null;
  }
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

/** Sunucuya henüz gitmemiş gün belgeleri — oturum düşse bile kalır */
export function readOutbox(uid: string): Record<string, DayPrayers> {
  try {
    const raw = localStorage.getItem(outboxKey(uid));
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

export function writeOutbox(uid: string, store: Record<string, DayPrayers>) {
  try {
    if (Object.keys(store).length === 0) {
      localStorage.removeItem(outboxKey(uid));
      return;
    }
    localStorage.setItem(outboxKey(uid), JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function upsertOutbox(uid: string, dateKey: string, day: DayPrayers) {
  const store = readOutbox(uid);
  store[dateKey] = normalizeDay(day);
  writeOutbox(uid, store);
}

export function removeOutboxDay(uid: string, dateKey: string) {
  const store = readOutbox(uid);
  if (!(dateKey in store)) return;
  delete store[dateKey];
  writeOutbox(uid, store);
}

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

/** Mirror + legacy + outbox (outbox son yerel niyet olarak kazanır) */
export function collectLocalSeed(uid: string): Record<string, DayPrayers> {
  const mirror = readDayMirror(uid);
  const outbox = readOutbox(uid);
  const legacy = readLegacyDays();
  const seed: Record<string, DayPrayers> = { ...legacy };
  for (const [key, day] of Object.entries(mirror)) {
    seed[key] = mergeDayPrayers(day, seed[key], undefined);
  }
  for (const [key, day] of Object.entries(outbox)) {
    seed[key] = normalizeDay(day);
  }
  return seed;
}
