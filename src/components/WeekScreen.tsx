import { useRef, useState } from "react";
import { DayBurst } from "./DayBurst";
import { PrayerIcon } from "./PrayerIcon";
import { SettingsSheet } from "./SettingsSheet";
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
  WEEK_TOTAL,
  weekDates,
  weekRangeLabel,
  type DayPrayers,
  type PrayerId,
} from "../lib/week";

const HOLD_MS = 10_000;

type Props = {
  weekStart: Date;
  days: Record<string, DayPrayers>;
  doneCount: number;
  ready: boolean;
  onShift: (weeks: number) => void;
  onSetPrayer: (dateKey: string, prayer: PrayerId, value: boolean) => void;
  onSignOut?: () => void;
};

export function WeekScreen({ weekStart, days, doneCount, ready, onShift, onSetPrayer, onSignOut }: Props) {
  const today = new Date();
  const dates = weekDates(weekStart);
  const canNext = canGoToNextWeek(weekStart, today);
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

  function markPrayer(dateKey: string, prayer: PrayerId, day: DayPrayers | undefined) {
    if (day?.[prayer]) return;
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
        <div className="topbar">
          <span className="topbar-spacer" aria-hidden="true" />
          <button type="button" className="nav" aria-label="Ayarlar" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
          </button>
        </div>
        <div className="summary-row" style={{ visibility: ready ? "visible" : "hidden" }}>
          <button type="button" className="nav" aria-label="Önceki hafta" onClick={() => onShift(-1)}>
            <Chevron direction="left" />
          </button>
          <div className="summary-block">
            <p className="summary">
              <span className="summary-done">{doneCount}</span>
              <span className="summary-total">/{WEEK_TOTAL}</span>
            </p>
            <p className="range">{weekRangeLabel(weekStart, today)}</p>
          </div>
          <button
            type="button"
            className="nav"
            aria-label="Sonraki hafta"
            disabled={!canNext}
            onClick={() => onShift(1)}
          >
            <Chevron direction="right" />
          </button>
        </div>
      </header>
      <div className="days">
        {dates.map((date, index) => {
          const key = formatDateKey(date);
          const future = isFutureDay(date, today);
          const todayRow = isSameDay(date, today);
          const day = days[key];
          return (
            <section key={key} className={todayRow ? "day today" : future ? "day future" : "day"}>
              <p className="day-label">{DAY_LABELS[index]}</p>
              <div className="prayers">
                {PRAYERS.map((prayer) => {
                  const done = Boolean(day?.[prayer]);
                  return (
                    <button
                      key={prayer}
                      type="button"
                      className={done ? "prayer locked" : "prayer"}
                      data-prayer={prayer}
                      aria-label={`${DAY_LABELS[index]} ${PRAYER_LABELS[prayer]}`}
                      aria-pressed={done}
                      disabled={!ready || future}
                      onClick={() => {
                        if (!done) markPrayer(key, prayer, day);
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
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <DayBurst token={burstToken} />
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSignOut={onSignOut}
      />
      {holdLeft !== null ? (
        <div className="hold-overlay" aria-live="polite">
          <span className="hold-count">{holdLeft}</span>
        </div>
      ) : null}
    </main>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={direction === "left" ? "M14.5 6 8.5 12l6 6" : "M9.5 6l6 6-6 6"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
