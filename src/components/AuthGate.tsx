import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { onAuthStateChanged, onIdTokenChanged, signInWithEmailAndPassword, type User } from "firebase/auth";
import { PIN_ACCOUNT_EMAIL, getFirebase } from "../firebase";
import { rememberUid } from "../lib/dayMirror";
import { ThemeToggle } from "./ThemeToggle";

type Props = { children: (user: User) => ReactNode };

export function AuthGate({ children }: Props) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const firebase = getFirebase();
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    if (!firebase) return;

    const unsubAuth = onAuthStateChanged(firebase.auth, (next) => {
      userRef.current = next;
      if (next) rememberUid(next.uid);
      setUser(next);
    });

    // Token yenilemesini canlı tut — sessizce düşmeyi azaltır
    const unsubToken = onIdTokenChanged(firebase.auth, (next) => {
      if (next) userRef.current = next;
    });

    const refreshToken = () => {
      const current = firebase.auth.currentUser ?? userRef.current;
      if (!current) return;
      void current.getIdToken(true).catch(() => {
        /* ağ yoksa mevcut oturum kalsın */
      });
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") refreshToken();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refreshToken);
    const interval = window.setInterval(refreshToken, 20 * 60_000);

    return () => {
      unsubAuth();
      unsubToken();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refreshToken);
      window.clearInterval(interval);
    };
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
      const cred = await signInWithEmailAndPassword(firebase.auth, PIN_ACCOUNT_EMAIL, nextPin);
      rememberUid(cred.user.uid);
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
