import { useEffect, useState } from "react";
import { fetchDayPrayerTimes, fetchWeekPrayerTimes, type DayTimes } from "../lib/prayerTimes";
import { addDays, formatDateKey } from "../lib/week";

export function usePrayerTimes(weekStart: Date) {
  const weekTime = weekStart.getTime();
  const [times, setTimes] = useState<Record<string, DayTimes>>({});
  const [hijri, setHijri] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);

    (async () => {
      try {
        const week = await fetchWeekPrayerTimes(new Date(weekTime));
        if (!active) return;

        let nextTimes = { ...week.times };
        let nextHijri = { ...week.hijri };

        const tomorrowKey = formatDateKey(addDays(new Date(), 1));
        if (!nextTimes[tomorrowKey]) {
          const extra = await fetchDayPrayerTimes(addDays(new Date(), 1));
          if (extra && active) {
            nextTimes = { ...nextTimes, ...extra.times };
            nextHijri = { ...nextHijri, ...extra.hijri };
          }
        }

        if (!active) return;
        setTimes(nextTimes);
        setHijri(nextHijri);
        setReady(true);
      } catch {
        if (!active) return;
        // Haftalık önbellek yoksa bile boş bırakma — önceki state kalsın
        setReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [weekTime]);

  const todayHijri = hijri[formatDateKey(new Date())] ?? null;

  return { times, hijri, todayHijri, ready };
}
