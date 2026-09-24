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

type Props = {
  weekStart: Date;
  days: Record<string, DayPrayers>;
  doneCount: number;
  ready: boolean;
  onShift: (weeks: number) => void;
  onToggle: (dateKey: string, prayer: PrayerId) => void;
  onSignOut?: () => void;
};

export function WeekScreen({ weekStart, days, doneCount, ready, onShift, onToggle, onSignOut }: Props) {
  const today = new Date();
  const dates = weekDates(weekStart);
  const canNext = canGoToNextWeek(weekStart, today);

  return (
    <main className="stage">
      <ThemeToggle />
      <header className={onSignOut ? "header with-exit" : "header"}>
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
                      className="prayer"
                      data-prayer={prayer}
                      aria-label={`${DAY_LABELS[index]} ${PRAYER_LABELS[prayer]}`}
                      aria-pressed={done}
                      disabled={!ready || future || done}
                      onClick={() => onToggle(key, prayer)}
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
