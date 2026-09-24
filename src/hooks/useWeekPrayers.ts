import { useEffect, useMemo, useState } from "react";
import { collection, doc, documentId, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { getFirebase } from "../firebase";
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

export function useWeekPrayers(uid: string, weekStart: Date) {
  const weekTime = weekStart.getTime();
  const dateKeys = useMemo(() => weekDates(new Date(weekTime)).map(formatDateKey), [weekTime]);
  const [days, setDays] = useState<Record<string, DayPrayers>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const firebase = getFirebase();
    if (!firebase) return;
    let active = true;
    setReady(false);
    const daysQuery = query(
      collection(firebase.db, "users", uid, "days"),
      where(documentId(), "in", dateKeys),
    );
    const unsubscribe = onSnapshot(
      daysQuery,
      (snapshot) => {
        if (!active) return;
        const next: Record<string, DayPrayers> = {};
        for (const key of dateKeys) next[key] = emptyDay();
        snapshot.forEach((item) => {
          next[item.id] = normalizeDay(item.data());
        });
        setDays(next);
        setReady(true);
      },
      () => {
        if (active) setReady(true);
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [uid, dateKeys]);

  async function setPrayer(dateKey: string, prayer: PrayerId, value: boolean) {
    const firebase = getFirebase();
    if (!firebase || !ready || isFutureDay(parseDateKey(dateKey))) return;
    const current = days[dateKey] ?? emptyDay();
    if (current[prayer] === value) return;
    const next = { ...current, [prayer]: value };
    setDays((prev) => ({ ...prev, [dateKey]: next }));
    try {
      await setDoc(doc(firebase.db, "users", uid, "days", dateKey), next);
    } catch {
      setDays((prev) => {
        const day = prev[dateKey];
        if (!day || day[prayer] !== next[prayer]) return prev;
        return { ...prev, [dateKey]: { ...day, [prayer]: current[prayer] } };
      });
    }
  }

  return {
    days,
    doneCount: countDone(days, dateKeys),
    ready,
    setPrayer,
  };
}
