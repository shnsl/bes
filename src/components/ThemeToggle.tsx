import { useTheme } from "../theme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const toDark = theme === "light";

  return (
    <button type="button" className="nav theme" aria-label={toDark ? "Koyu tema" : "Açık tema"} onClick={toggle}>
      {toDark ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15.2 4.6a6.4 6.4 0 1 0 4.2 10.8A5.2 5.2 0 0 1 15.2 4.6z" fill="currentColor" />
    </svg>
  );
}
