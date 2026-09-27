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
        <path d="M12 4.5v2.6" />
        <path d="M6.2 8.2 7.8 9.5" />
        <path d="M17.8 8.2 16.2 9.5" />
        <path d="M5 15.2h14" />
        <path d="M8.2 15.2a3.8 3.8 0 0 1 7.6 0" />
      </svg>
    );
  }

  if (id === "ogle") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3.1" />
        <path d="M12 3.8v2M12 18.2v2M3.8 12h2M18.2 12h2M6.2 6.2l1.4 1.4M16.4 16.4l1.4 1.4M17.8 6.2l-1.4 1.4M7.6 16.4 6.2 17.8" />
      </svg>
    );
  }

  if (id === "ikindi") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12.2" r="3.1" />
        <path d="M12 5.2v2" />
        <path d="M6.4 8.2 7.8 9.5" />
        <path d="M17.6 8.2 16.2 9.5" />
      </svg>
    );
  }

  if (id === "aksam") {
    return (
      <svg {...common}>
        <path d="M4 13.6h16" />
        <path d="M8 13.6a4 4 0 0 1 8 0" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path
        d="M15.1 5.2a6.3 6.3 0 1 0 3.9 10.5A5.1 5.1 0 0 1 15.1 5.2z"
        strokeWidth={1.8}
      />
    </svg>
  );
}
