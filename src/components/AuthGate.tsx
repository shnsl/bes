import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, type User } from "firebase/auth";
import { PIN_ACCOUNT_EMAIL, getFirebase } from "../firebase";
import { ThemeToggle } from "./ThemeToggle";

type Props = { children: (user: User) => ReactNode };

export function AuthGate({ children }: Props) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const firebase = getFirebase();

  useEffect(() => {
    if (!firebase) return;
    return onAuthStateChanged(firebase.auth, setUser);
  }, [firebase]);

  if (!firebase || user === undefined) return <main className="stage" />;
  if (!user) return <PinScreen />;
  return children(user);
}

function PinScreen() {
  const [pin, setPin] = useState("");
  const [bad, setBad] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit(nextPin = pin) {
    const firebase = getFirebase();
    if (!firebase || nextPin.length !== 6 || busy) return;
    setBusy(true);
    setBad(false);
    try {
      await signInWithEmailAndPassword(firebase.auth, PIN_ACCOUNT_EMAIL, nextPin);
    } catch {
      setPin("");
      setBad(true);
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  return (
    <main className="stage center gate">
      <ThemeToggle />
      <form className={bad ? "pin-form bad" : "pin-form"} onSubmit={onSubmit} onClick={() => inputRef.current?.focus()}>
        <div className="pin-slots" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className={index < pin.length ? "pin-slot filled" : "pin-slot"} />
          ))}
        </div>
        <input
          ref={inputRef}
          className="pin"
          inputMode="numeric"
          autoComplete="current-password"
          autoFocus
          maxLength={6}
          pattern="[0-9]{6}"
          aria-label="Şifre"
          value={pin}
          disabled={busy}
          onChange={(event) => {
            const next = event.target.value.replace(/\D/g, "").slice(0, 6);
            setBad(false);
            setPin(next);
            if (next.length === 6) void submit(next);
          }}
        />
      </form>
    </main>
  );
}
