import { useEffect, useMemo, useState } from "react";
import {
  countDone,
  emptyDay,
  formatDateKey,
  isFutureDay,
  normalizeDay,
  parseDateKey,
  weekDates,
  type DayPrayers,
  type PrayerId,
} from "../lib/week";

const STORAGE_KEY = "bes-days";

function readStore(): Record<string, DayPrayers> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<DayPrayers>>;
    const store: Record<string, DayPrayers> = {};
    for (const [key, value] of Object.entries(parsed)) store[key] = normalizeDay(value);
    return store;
  } catch {
    return {};
  }
}

export function useLocalWeekPrayers(weekStart: Date) {
  const weekTime = weekStart.getTime();
  const dateKeys = useMemo(() => weekDates(new Date(weekTime)).map(formatDateKey), [weekTime]);
  const [store, setStore] = useState<Record<string, DayPrayers>>(() => readStore());

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setStore(readStore());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const days = useMemo(() => {
    const next: Record<string, DayPrayers> = {};
    for (const key of dateKeys) next[key] = store[key] ?? emptyDay();
    return next;
  }, [dateKeys, store]);

  function toggle(dateKey: string, prayer: PrayerId) {
    if (isFutureDay(parseDateKey(dateKey))) return;
    setStore((prev) => {
      const current = prev[dateKey] ?? emptyDay();
      if (current[prayer]) return prev;
      const next = { ...prev, [dateKey]: { ...current, [prayer]: true } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  return {
    days,
    doneCount: countDone(days, dateKeys),
    ready: true,
    toggle,
  };
}
