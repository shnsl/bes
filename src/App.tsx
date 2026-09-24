import { useState } from "react";
import { signOut } from "firebase/auth";
import { AuthGate } from "./components/AuthGate";
import { WeekScreen } from "./components/WeekScreen";
import { getFirebase, isFirebaseConfigured } from "./firebase";
import { useLocalWeekPrayers } from "./hooks/useLocalWeekPrayers";
import { useWeekPrayers } from "./hooks/useWeekPrayers";
import { addDays, startOfWeek } from "./lib/week";

export function App() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const shift = (weeks: number) => setWeekStart((current) => addDays(current, weeks * 7));

  if (!isFirebaseConfigured()) return <LocalWeek weekStart={weekStart} onShift={shift} />;

  return (
    <AuthGate>
      {(user) => <CloudWeek uid={user.uid} weekStart={weekStart} onShift={shift} />}
    </AuthGate>
  );
}

function LocalWeek({ weekStart, onShift }: { weekStart: Date; onShift: (weeks: number) => void }) {
  const state = useLocalWeekPrayers(weekStart);
  return <WeekScreen weekStart={weekStart} onShift={onShift} onToggle={state.toggle} {...state} />;
}

function CloudWeek({
  uid,
  weekStart,
  onShift,
}: {
  uid: string;
  weekStart: Date;
  onShift: (weeks: number) => void;
}) {
  const state = useWeekPrayers(uid, weekStart);
  const firebase = getFirebase();
  return (
    <WeekScreen
      weekStart={weekStart}
      onShift={onShift}
      onToggle={state.toggle}
      onSignOut={firebase ? () => signOut(firebase.auth) : undefined}
      {...state}
    />
  );
}
