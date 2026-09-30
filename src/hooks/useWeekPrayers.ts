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
  collectLocalSeed,
  dayHasMark,
  mergeDayPrayers,
  readOutbox,
  rememberUid,
  removeOutboxDay,
  upsertDayMirror,
  upsertOutbox,
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

async function writeDayWithRetry(
  uid: string,
  dateKey: string,
  day: DayPrayers,
  attempts = 4,
): Promise<boolean> {
  const firebase = getFirebase();
  if (!firebase) return false;
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      await setDoc(doc(firebase.db, "users", uid, "days", dateKey), day, { merge: true });
      removeOutboxDay(uid, dateKey);
      upsertDayMirror(uid, dateKey, day);
      return true;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => window.setTimeout(resolve, 400 * (i + 1) * (i + 1)));
    }
  }
  console.error("bes writeDayWithRetry", dateKey, lastError);
  return false;
}

export function useWeekPrayers(uid: string, weekStart: Date) {
  const weekTime = weekStart.getTime();
  const dateKeys = useMemo(() => weekDates(new Date(weekTime)).map(formatDateKey), [weekTime]);
  const mirrorRef = useRef<Record<string, DayPrayers>>(collectLocalSeed(uid));
  const pendingRef = useRef<PendingMap>({});
  const syncingRef = useRef(new Set<string>());
  const [days, setDays] = useState<Record<string, DayPrayers>>(() => {
    const seed = collectLocalSeed(uid);
    const next: Record<string, DayPrayers> = {};
    for (const key of dateKeys) next[key] = seed[key] ?? emptyDay();
    return next;
  });
  const [ready, setReady] = useState(() => weekHasMarks(collectLocalSeed(uid), dateKeys));
  const [offline, setOffline] = useState(!navigator.onLine);
  const [allDays, setAllDays] = useState<Record<string, DayPrayers>>(() => collectLocalSeed(uid));

  useEffect(() => {
    rememberUid(uid);
    mirrorRef.current = collectLocalSeed(uid);
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

    const seed = collectLocalSeed(uid);
    mirrorRef.current = seed;
    setAllDays(seed);
    setDays(() => {
      const next: Record<string, DayPrayers> = {};
      for (const key of dateKeys) next[key] = seed[key] ?? emptyDay();
      return next;
    });
    if (!weekHasMarks(seed, dateKeys)) setReady(false);

    const daysCol = collection(firebase.db, "users", uid, "days");

    async function flushOutbox() {
      const box = readOutbox(uid);
      for (const [dateKey, day] of Object.entries(box)) {
        if (syncingRef.current.has(dateKey)) continue;
        syncingRef.current.add(dateKey);
        const ok = await writeDayWithRetry(uid, dateKey, day);
        syncingRef.current.delete(dateKey);
        if (!ok && active) setOffline(true);
      }
    }

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
        upsertOutbox(uid, dateKey, day);
        const ok = await writeDayWithRetry(uid, dateKey, day);
        syncingRef.current.delete(dateKey);
        if (!ok && active) setOffline(true);
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

      const outbox = readOutbox(uid);
      const mirrorNow = { ...mirrorRef.current };

      for (const [key, remoteDay] of Object.entries(remoteAll)) {
        mirrorNow[key] = mergeDayPrayers(remoteDay, mirrorNow[key], pendingRef.current[key]);
      }

      // Outbox: henüz sunucuya gitmemiş son niyet
      for (const [key, day] of Object.entries(outbox)) {
        mirrorNow[key] = normalizeDay(day);
      }

      const next: Record<string, DayPrayers> = {};
      for (const key of dateKeys) {
        const merged = outbox[key]
          ? normalizeDay(outbox[key])
          : mergeDayPrayers(remoteAll[key], mirrorNow[key], pendingRef.current[key]);
        next[key] = merged;
        mirrorNow[key] = merged;
      }

      mirrorRef.current = mirrorNow;
      writeDayMirror(uid, mirrorNow);
      setAllDays(mirrorNow);
      setDays(next);
      setReady(true);

      void flushOutbox().then(() => pushMissingToServer(remoteAll, mirrorNow));
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
      void flushOutbox()
        .then(() => waitForPendingWrites(firebase.db))
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

    void flushOutbox().finally(() => {
      if (active) pullServer();
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void flushOutbox().finally(pullServer);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", pullServer);
    window.addEventListener("online", pullServer);

    return () => {
      active = false;
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", pullServer);
      window.removeEventListener("online", pullServer);
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

    // Önce yerel kalıcılık — oturum düşse bile kaybolmasın
    mirrorRef.current = { ...mirrorRef.current, [dateKey]: nextDay };
    upsertDayMirror(uid, dateKey, nextDay);
    upsertOutbox(uid, dateKey, nextDay);
    setDays((prev) => ({ ...prev, [dateKey]: nextDay }));
    setAllDays(mirrorRef.current);

    const ok = await writeDayWithRetry(uid, dateKey, nextDay);
    const pending = pendingRef.current[dateKey];
    if (pending) {
      delete pending[prayer];
      if (Object.keys(pending).length === 0) delete pendingRef.current[dateKey];
    }
    if (!ok) setOffline(true);
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
