import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  documentId,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { getFirebase } from "../firebase";
import {
  mergeDayPrayers,
  readDayMirror,
  upsertDayMirror,
  writeDayMirror,
} from "../lib/dayMirror";
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

type PendingMap = Record<string, Partial<Record<PrayerId, boolean>>>;

export function useWeekPrayers(uid: string, weekStart: Date) {
  const weekTime = weekStart.getTime();
  const dateKeys = useMemo(() => weekDates(new Date(weekTime)).map(formatDateKey), [weekTime]);
  const mirrorRef = useRef<Record<string, DayPrayers>>(readDayMirror(uid));
  const pendingRef = useRef<PendingMap>({});
  const [days, setDays] = useState<Record<string, DayPrayers>>(() => {
    const mirror = readDayMirror(uid);
    const next: Record<string, DayPrayers> = {};
    for (const key of dateKeys) next[key] = mirror[key] ?? emptyDay();
    return next;
  });
  const [ready, setReady] = useState(true);
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    mirrorRef.current = readDayMirror(uid);
  }, [uid]);

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    const firebase = getFirebase();
    if (!firebase) return;
    let active = true;

    const mirror = readDayMirror(uid);
    mirrorRef.current = mirror;
    setDays((prev) => {
      const next: Record<string, DayPrayers> = {};
      for (const key of dateKeys) {
        next[key] = mergeDayPrayers(prev[key], mirror[key], pendingRef.current[key], false);
      }
      return next;
    });

    const daysQuery = query(
      collection(firebase.db, "users", uid, "days"),
      where(documentId(), "in", dateKeys),
    );

    const unsubscribe = onSnapshot(
      daysQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!active) return;
        setOffline(snapshot.metadata.fromCache && !navigator.onLine);

        const remote: Record<string, DayPrayers> = {};
        const present = new Set<string>();
        snapshot.forEach((item) => {
          present.add(item.id);
          remote[item.id] = normalizeDay(item.data());
        });

        const mirrorNow = { ...mirrorRef.current };
        const next: Record<string, DayPrayers> = {};
        for (const key of dateKeys) {
          const merged = mergeDayPrayers(
            remote[key],
            mirrorNow[key],
            pendingRef.current[key],
            present.has(key),
          );
          next[key] = merged;
          mirrorNow[key] = merged;
        }
        mirrorRef.current = mirrorNow;
        writeDayMirror(uid, mirrorNow);
        setDays(next);
        setReady(true);
      },
      () => {
        if (!active) return;
        setOffline(true);
        setReady(true);
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [uid, dateKeys]);

  async function setPrayer(dateKey: string, prayer: PrayerId, value: boolean) {
    const firebase = getFirebase();
    if (!firebase || isFutureDay(parseDateKey(dateKey))) return;

    const current = days[dateKey] ?? mirrorRef.current[dateKey] ?? emptyDay();
    if (current[prayer] === value) return;
    const nextDay = { ...current, [prayer]: value };

    pendingRef.current[dateKey] = {
      ...pendingRef.current[dateKey],
      [prayer]: value,
    };

    setDays((prev) => ({ ...prev, [dateKey]: nextDay }));
    mirrorRef.current = { ...mirrorRef.current, [dateKey]: nextDay };
    upsertDayMirror(uid, dateKey, nextDay);

    try {
      await setDoc(doc(firebase.db, "users", uid, "days", dateKey), nextDay, { merge: true });
      const pending = pendingRef.current[dateKey];
      if (pending) {
        delete pending[prayer];
        if (Object.keys(pending).length === 0) delete pendingRef.current[dateKey];
      }
      // Başarılı yazımdan sonra aynayı kesinleştir
      upsertDayMirror(uid, dateKey, nextDay);
    } catch {
      setOffline(true);
      // Yerel ayna ve UI işaretli kalsın; senkron sonra tamamlanır
      const pending = pendingRef.current[dateKey];
      if (pending) {
        delete pending[prayer];
        if (Object.keys(pending).length === 0) delete pendingRef.current[dateKey];
      }
    }
  }

  return {
    days,
    doneCount: countDone(days, dateKeys),
    ready,
    offline,
    setPrayer,
  };
}
