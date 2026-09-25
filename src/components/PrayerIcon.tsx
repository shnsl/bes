import type { PrayerId } from "../lib/week";

type Props = { id: PrayerId };

export function PrayerIcon({ id }: Props) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (id === "sabah") {
    return (
      <svg {...common}>
        <path d="M12 3v3" />
        <path d="M6 7.5 7.8 9" />
        <path d="M18 7.5 16.2 9" />
        <path d="M5 16h14" />
        <path d="M8 16a4 4 0 0 1 8 0" />
      </svg>
    );
  }

  if (id === "ogle") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
      </svg>
    );
  }

  if (id === "ikindi") {
    return (
      <svg {...common}>
        <circle cx="12" cy="14" r="3.1" />
        <path d="M12 6.2v2" />
        <path d="M6.4 9.2 7.8 10.5" />
        <path d="M17.6 9.2 16.2 10.5" />
      </svg>
    );
  }

  if (id === "aksam") {
    return (
      <svg {...common}>
        <path d="M3 16.5h18" />
        <path d="M7.5 16.5a4.5 4.5 0 0 1 9 0" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path
        d="M15.2 4.6a6.4 6.4 0 1 0 4.2 10.8A5.2 5.2 0 0 1 15.2 4.6z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}
