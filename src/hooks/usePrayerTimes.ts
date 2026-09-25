import { useEffect, useState } from "react";
import { fetchWeekPrayerTimes, type DayTimes } from "../lib/prayerTimes";
import { formatDateKey } from "../lib/week";

export function usePrayerTimes(weekStart: Date) {
  const weekTime = weekStart.getTime();
  const [times, setTimes] = useState<Record<string, DayTimes>>({});
  const [hijri, setHijri] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);

    fetchWeekPrayerTimes(new Date(weekTime))
      .then((next) => {
        if (!active) return;
        setTimes(next.times);
        setHijri(next.hijri);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setTimes({});
        setHijri({});
        setReady(true);
      });

    return () => {
      active = false;
    };
  }, [weekTime]);

  const todayHijri = hijri[formatDateKey(new Date())] ?? null;

  return { times, hijri, todayHijri, ready };
}
