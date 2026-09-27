import { useState } from "react";
import { signOut } from "firebase/auth";
import { AuthGate } from "./components/AuthGate";
import { WeekScreen } from "./components/WeekScreen";
import { getFirebase, isFirebaseConfigured } from "./firebase";
import { useLocalWeekPrayers } from "./hooks/useLocalWeekPrayers";
import { useWeekPrayers } from "./hooks/useWeekPrayers";
import {
  addDays,
  findFirstUnmarkedWeekStart,
  findLastMarkedWeekStart,
  startOfWeek,
  type DayPrayers,
} from "./lib/week";

export function App() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const shift = (weeks: number) => setWeekStart((current) => addDays(current, weeks * 7));
  const goTo = (date: Date | null) => {
    if (!date) return;
    setWeekStart(startOfWeek(date));
  };

  if (!isFirebaseConfigured()) {
    return <LocalWeek weekStart={weekStart} onShift={shift} onGoTo={goTo} />;
  }

  return (
    <AuthGate>
      {(user) => <CloudWeek uid={user.uid} weekStart={weekStart} onShift={shift} onGoTo={goTo} />}
    </AuthGate>
  );
}

type WeekNav = {
  weekStart: Date;
  onShift: (weeks: number) => void;
  onGoTo: (date: Date | null) => void;
};

function useWeekJumps(
  allDays: Record<string, DayPrayers>,
  weekStart: Date,
  onGoTo: (date: Date | null) => void,
) {
  const first = findFirstUnmarkedWeekStart(allDays);
  const last = findLastMarkedWeekStart(allDays);
  const weekTime = startOfWeek(weekStart).getTime();
  return {
    goFirstUnmarked: () => onGoTo(first),
    goLastMarked: () => onGoTo(last),
    canGoFirstUnmarked: first !== null && first.getTime() !== weekTime,
    canGoLastMarked: last !== null && last.getTime() !== weekTime,
  };
}

function LocalWeek({ weekStart, onShift, onGoTo }: WeekNav) {
  const state = useLocalWeekPrayers(weekStart);
  const jumps = useWeekJumps(state.allDays, weekStart, onGoTo);
  return (
    <WeekScreen
      weekStart={weekStart}
      days={state.days}
      ready={state.ready}
      onShift={onShift}
      onGoFirstUnmarked={jumps.goFirstUnmarked}
      onGoLastMarked={jumps.goLastMarked}
      canGoFirstUnmarked={jumps.canGoFirstUnmarked}
      canGoLastMarked={jumps.canGoLastMarked}
      onSetPrayer={state.setPrayer}
    />
  );
}

function CloudWeek({ uid, weekStart, onShift, onGoTo }: WeekNav & { uid: string }) {
  const state = useWeekPrayers(uid, weekStart);
  const firebase = getFirebase();
  const jumps = useWeekJumps(state.allDays, weekStart, onGoTo);
  return (
    <WeekScreen
      weekStart={weekStart}
      days={state.days}
      ready={state.ready}
      offline={state.offline}
      onShift={onShift}
      onGoFirstUnmarked={jumps.goFirstUnmarked}
      onGoLastMarked={jumps.goLastMarked}
      canGoFirstUnmarked={jumps.canGoFirstUnmarked}
      canGoLastMarked={jumps.canGoLastMarked}
      onSetPrayer={state.setPrayer}
      onSignOut={firebase ? () => signOut(firebase.auth) : undefined}
    />
  );
}
