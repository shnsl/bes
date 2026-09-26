import { useEffect, useRef, useState } from "react";
import { DayBurst } from "./DayBurst";
import { PrayerIcon } from "./PrayerIcon";
import { SettingsSheet } from "./SettingsSheet";
import { usePrayerTimes } from "../hooks/usePrayerTimes";
import { getUpcomingPrayer, hasPrayerStarted, isKerahatNow, type DayTimes } from "../lib/prayerTimes";
import {
  canGoToNextWeek,
  DAY_LABELS,
  emptyDay,
  formatDateKey,
  isDayComplete,
  isFutureDay,
  isSameDay,
  PRAYER_LABELS,
  PRAYERS,
  weekDates,
  type DayPrayers,
  type PrayerId,
} from "../lib/week";

const HOLD_MS = 10_000;

type Props = {
  weekStart: Date;
  days: Record<string, DayPrayers>;
  ready: boolean;
  onShift: (weeks: number) => void;
  onSetPrayer: (dateKey: string, prayer: PrayerId, value: boolean) => void;
  onSignOut?: () => void;
};

export function WeekScreen({ weekStart, days, ready, onShift, onSetPrayer, onSignOut }: Props) {
  const today = new Date();
  const dates = weekDates(weekStart);
  const canNext = canGoToNextWeek(weekStart, today);
  const { times: prayerTimes, todayHijri } = usePrayerTimes(weekStart);
  const now = useNow(30_000);
  const todayKey = formatDateKey(now);
  const upcoming = getUpcomingPrayer(prayerTimes[todayKey], now);
  const kerahat = isKerahatNow(prayerTimes[todayKey], now);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [burstToken, setBurstToken] = useState(0);
  const [holdLeft, setHoldLeft] = useState<number | null>(null);
  const holdRef = useRef<{
    key: string;
    prayer: PrayerId;
    timer: number;
    tick: number;
    opened: boolean;
  } | null>(null);

  function markPrayer(
    dateKey: string,
    prayer: PrayerId,
    day: DayPrayers | undefined,
    date: Date,
    dayTimes: DayTimes | undefined,
  ) {
    if (day?.[prayer]) return;
    if (!hasPrayerStarted(date, prayer, dayTimes, now)) return;
    const next = { ...emptyDay(), ...day, [prayer]: true };
    onSetPrayer(dateKey, prayer, true);
    if (!isDayComplete(day) && isDayComplete(next)) {
      setBurstToken((n) => n + 1);
    }
  }

  function clearHold() {
    const active = holdRef.current;
    if (!active) return;
    window.clearTimeout(active.timer);
    window.clearInterval(active.tick);
    holdRef.current = null;
    setHoldLeft(null);
  }

  function startUnlockHold(dateKey: string, prayer: PrayerId) {
    clearHold();
    const started = Date.now();
    setHoldLeft(10);
    const tick = window.setInterval(() => {
      const left = Math.max(1, Math.ceil((HOLD_MS - (Date.now() - started)) / 1000));
      setHoldLeft(left);
    }, 100);
    const timer = window.setTimeout(() => {
      const active = holdRef.current;
      if (!active) return;
      active.opened = true;
      window.clearInterval(active.tick);
      holdRef.current = null;
      setHoldLeft(null);
      onSetPrayer(dateKey, prayer, false);
    }, HOLD_MS);
    holdRef.current = { key: dateKey, prayer, timer, tick, opened: false };
  }

  return (
    <main className="stage home">
      <header className="chrome">
        <div className="topbar" aria-hidden="true" />
      </header>
      <div className="days">
        {dates.map((date, index) => {
          const key = formatDateKey(date);
          const future = isFutureDay(date, today);
          const todayRow = isSameDay(date, today);
          const day = days[key];
          const dayTimes = prayerTimes[key];
          return (
            <section key={key} className={todayRow ? "day today" : future ? "day future" : "day"}>
              <p className="day-label">{DAY_LABELS[index]}</p>
              <div className="prayers">
                {PRAYERS.map((prayer) => {
                  const done = Boolean(day?.[prayer]);
                  const showClock = todayRow || future;
                  const clock = showClock ? dayTimes?.[prayer] : undefined;
                  const started = hasPrayerStarted(date, prayer, dayTimes, now);
                  const blocked = !done && !started;
                  const eta = todayRow && upcoming?.prayer === prayer ? upcoming.minutes : null;
                  return (
                    <div key={prayer} className="prayer-cell">
                      <div className="prayer-stack">
                        <span className="prayer-eta" aria-hidden="true">
                          {eta !== null ? eta : "\u00A0"}
                        </span>
                        <button
                          type="button"
                          className={done ? "prayer locked" : blocked ? "prayer waiting" : "prayer"}
                          data-prayer={prayer}
                          data-eta={eta !== null ? "true" : undefined}
                          aria-label={
                            eta !== null
                              ? `${DAY_LABELS[index]} ${PRAYER_LABELS[prayer]} ${clock ?? ""} ${eta} dakika kaldı`
                              : clock
                                ? `${DAY_LABELS[index]} ${PRAYER_LABELS[prayer]} ${clock}`
                                : `${DAY_LABELS[index]} ${PRAYER_LABELS[prayer]}`
                          }
                          aria-pressed={done}
                          disabled={!ready || future || blocked}
                          onClick={() => {
                            if (!done) markPrayer(key, prayer, day, date, dayTimes);
                          }}
                          onPointerDown={(event) => {
                            if (!done || !ready || future || event.button !== 0) return;
                            event.currentTarget.setPointerCapture(event.pointerId);
                            startUnlockHold(key, prayer);
                          }}
                          onPointerUp={clearHold}
                          onPointerCancel={clearHold}
                          onLostPointerCapture={clearHold}
                          onContextMenu={(event) => event.preventDefault()}
                        >
                          <PrayerIcon id={prayer} />
                        </button>
                        <span className="prayer-time" aria-hidden="true">
                          {showClock ? (clock ?? "··:··") : "\u00A0"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <footer className="dock">
        <button
          type="button"
          className={kerahat ? "nav dock-signal kerahat" : "nav dock-signal ok"}
          aria-label={kerahat ? "Ayarlar — kerahat vakti" : "Ayarlar"}
          title={kerahat ? "Kerahat vakti" : "Kerahat dışı"}
          onClick={() => setSettingsOpen(true)}
        >
          <SettingsIcon />
        </button>
      </footer>
      <DayBurst token={burstToken} />
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSignOut={onSignOut}
        hijriLabel={todayHijri}
        canNextWeek={canNext}
        onShiftWeek={onShift}
      />
      {holdLeft !== null ? (
        <div className="hold-overlay" aria-live="polite">
          <span className="hold-count">{holdLeft}</span>
        </div>
      ) : null}
    </main>
  );
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);
  return now;
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.1 7.1 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 14.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.6.24-1.15.55-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L3.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.48.39 1.03.7 1.63.94l.36 2.54c.05.24.25.42.49.42h3.8c.24 0 .44-.18.49-.42l.36-2.54c.6-.24 1.15-.55 1.63-.94l2.39.96c.25.1.54 0 .68-.22l1.92-3.32a.5.5 0 0 0-.12-.64z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
