import { useRef, useState } from "react";
import { PrayerIcon } from "./PrayerIcon";
import { ThemeToggle } from "./ThemeToggle";
import {
  canGoToNextWeek,
  DAY_LABELS,
  formatDateKey,
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
  const [holdLeft, setHoldLeft] = useState<number | null>(null);
  const holdRef = useRef<{
    key: string;
    prayer: PrayerId;
    timer: number;
    tick: number;
    opened: boolean;
  } | null>(null);

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
      <header className="topbar">
        <button type="button" className="nav" aria-label="Önceki hafta" onClick={() => onShift(-1)}>
          <Chevron direction="left" />
        </button>
        <div className="summary-block" style={{ visibility: ready ? "visible" : "hidden" }}>
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
        <ThemeToggle />
        {onSignOut ? (
          <button type="button" className="nav exit" aria-label="Çıkış" onClick={onSignOut}>
            <ExitIcon />
          </button>
        ) : null}
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
                        if (!done) onSetPrayer(key, prayer, true);
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

function ExitIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 7V5H6v14h4v-2M10 12H19M16 9l3 3-3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
