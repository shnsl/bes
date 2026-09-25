import { useEffect, useState } from "react";
import { fetchWeekPrayerTimes, type DayTimes } from "../lib/prayerTimes";

export function usePrayerTimes(weekStart: Date) {
  const weekTime = weekStart.getTime();
  const [times, setTimes] = useState<Record<string, DayTimes>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    setReady(false);

    fetchWeekPrayerTimes(new Date(weekTime))
      .then((next) => {
        if (!active) return;
        setTimes(next);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        setTimes({});
        setReady(true);
      });

    return () => {
      active = false;
    };
  }, [weekTime]);

  return { times, ready };
}
