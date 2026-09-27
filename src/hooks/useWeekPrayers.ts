import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  getDocsFromServer,
  onSnapshot,
  setDoc,
  waitForPendingWrites,
  type QuerySnapshot,
} from "firebase/firestore";
import { getFirebase } from "../firebase";
import {
  dayHasMark,
  mergeDayPrayers,
  readDayMirror,
  readLegacyDays,
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
  PRAYERS,
  weekDates,
  type DayPrayers,
  type PrayerId,
} from "../lib/week";

type PendingMap = Record<string, Partial<Record<PrayerId, boolean>>>;

function weekHasMarks(store: Record<string, DayPrayers>, keys: string[]): boolean {
  return keys.some((key) => dayHasMark(store[key]));
}

function collectSeed(uid: string): Record<string, DayPrayers> {
  const mirror = readDayMirror(uid);
  const legacy = readLegacyDays();
  const seed: Record<string, DayPrayers> = { ...legacy };
  for (const [key, day] of Object.entries(mirror)) {
    seed[key] = mergeDayPrayers(day, seed[key], undefined);
  }
  return seed;
}

export function useWeekPrayers(uid: string, weekStart: Date) {
  const weekTime = weekStart.getTime();
  const dateKeys = useMemo(() => weekDates(new Date(weekTime)).map(formatDateKey), [weekTime]);
  const mirrorRef = useRef<Record<string, DayPrayers>>(collectSeed(uid));
  const pendingRef = useRef<PendingMap>({});
  const syncingRef = useRef(new Set<string>());
  const [days, setDays] = useState<Record<string, DayPrayers>>(() => {
    const seed = collectSeed(uid);
    const next: Record<string, DayPrayers> = {};
    for (const key of dateKeys) next[key] = seed[key] ?? emptyDay();
    return next;
  });
  const [ready, setReady] = useState(() => weekHasMarks(collectSeed(uid), dateKeys));
  const [offline, setOffline] = useState(!navigator.onLine);
  const [allDays, setAllDays] = useState<Record<string, DayPrayers>>(() => collectSeed(uid));

  useEffect(() => {
    mirrorRef.current = collectSeed(uid);
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

    const seed = collectSeed(uid);
    mirrorRef.current = seed;
    setDays(() => {
      const next: Record<string, DayPrayers> = {};
      for (const key of dateKeys) next[key] = seed[key] ?? emptyDay();
      return next;
    });
    if (!weekHasMarks(seed, dateKeys)) setReady(false);

    const daysCol = collection(firebase.db, "users", uid, "days");

    async function pushMissingToServer(
      remoteAll: Record<string, DayPrayers>,
      mergedAll: Record<string, DayPrayers>,
    ) {
      for (const [dateKey, day] of Object.entries(mergedAll)) {
        if (!dayHasMark(day)) continue;
        const remote = remoteAll[dateKey];
        const needsPush =
          !remote ||
          PRAYERS.some((prayer) => day[prayer] === true && remote[prayer] !== true);
        if (!needsPush) continue;
        if (syncingRef.current.has(dateKey)) continue;
        syncingRef.current.add(dateKey);
        try {
          await setDoc(doc(firebase!.db, "users", uid, "days", dateKey), day, { merge: true });
        } catch (error) {
          console.error("bes sync-up", dateKey, error);
          if (active) setOffline(true);
        } finally {
          syncingRef.current.delete(dateKey);
        }
      }
    }

    function applySnapshot(snapshot: QuerySnapshot, fromServer: boolean) {
      if (!active) return;

      const fromCache = snapshot.metadata.fromCache;
      if (!fromServer && fromCache && snapshot.empty && navigator.onLine) {
        if (!weekHasMarks(mirrorRef.current, dateKeys)) return;
      }

      setOffline(fromCache && !navigator.onLine);

      const remoteAll: Record<string, DayPrayers> = {};
      snapshot.forEach((item) => {
        remoteAll[item.id] = normalizeDay(item.data());
      });

      const mirrorNow = { ...mirrorRef.current };
      for (const [key, remoteDay] of Object.entries(remoteAll)) {
        mirrorNow[key] = mergeDayPrayers(remoteDay, mirrorNow[key], pendingRef.current[key]);
      }

      const next: Record<string, DayPrayers> = {};
      for (const key of dateKeys) {
        const merged = mergeDayPrayers(remoteAll[key], mirrorNow[key], pendingRef.current[key]);
        next[key] = merged;
        mirrorNow[key] = merged;
      }

      mirrorRef.current = mirrorNow;
      writeDayMirror(uid, mirrorNow);
      setAllDays(mirrorNow);
      setDays(next);
      setReady(true);

      // Web önbelleğinde olup sunucuda eksik olan işaretleri yukarı yaz
      void pushMissingToServer(remoteAll, mirrorNow);
    }

    const unsubscribe = onSnapshot(
      daysCol,
      { includeMetadataChanges: true },
      (snapshot) => applySnapshot(snapshot, false),
      (error) => {
        console.error("bes days snapshot", error);
        if (!active) return;
        setOffline(true);
        setReady(true);
      },
    );

    const pullServer = () => {
      void waitForPendingWrites(firebase.db)
        .catch(() => undefined)
        .finally(() => {
          if (!active) return;
          getDocsFromServer(daysCol)
            .then((snapshot) => applySnapshot(snapshot, true))
            .catch((error) => {
              console.error("bes days server", error);
              if (!active) return;
              if (!navigator.onLine) setOffline(true);
              setReady(true);
            });
        });
    };

    pullServer();

    const onVisible = () => {
      if (document.visibilityState === "visible") pullServer();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", pullServer);

    return () => {
      active = false;
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", pullServer);
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
    setAllDays(mirrorRef.current);
    upsertDayMirror(uid, dateKey, nextDay);

    try {
      await setDoc(doc(firebase.db, "users", uid, "days", dateKey), nextDay, { merge: true });
      const pending = pendingRef.current[dateKey];
      if (pending) {
        delete pending[prayer];
        if (Object.keys(pending).length === 0) delete pendingRef.current[dateKey];
      }
      upsertDayMirror(uid, dateKey, nextDay);
    } catch (error) {
      console.error("bes setPrayer", error);
      setOffline(true);
    }
  }

  return {
    days,
    allDays,
    doneCount: countDone(days, dateKeys),
    ready,
    offline,
    setPrayer,
  };
}
