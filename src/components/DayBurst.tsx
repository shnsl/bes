import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  /** Artınca animasyon yeniden başlar; 0 iken gizli */
  token: number;
};

const HUES = ["#d4af37", "#f2c94c", "#fff6d4", "#8ea0e6", "#e07a90", "#e08a4a", "#ffffff"];
const DURATION_MS = 2200;
const SPARK_COUNT = 42;

export function DayBurst({ token }: Props) {
  const [show, setShow] = useState(false);
  const layerRef = useRef<HTMLDivElement>(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    if (!token) return;
    setShow(true);
  }, [token]);

  useEffect(() => {
    if (!show || !token) return;

    const runId = ++runIdRef.current;
    let hideTimer = 0;

    // Portal ilk frame'de ref bağlansın
    const startTimer = window.setTimeout(() => {
      if (runId !== runIdRef.current) return;
      const layer = layerRef.current;
      if (!layer) {
        setShow(false);
        return;
      }

      layer.replaceChildren();

      const flash = document.createElement("div");
      flash.className = "day-burst-flash";
      layer.appendChild(flash);
      flash.animate(
        [{ opacity: 0 }, { opacity: 0.9, offset: 0.15 }, { opacity: 0 }],
        { duration: 900, easing: "ease-out", fill: "forwards" },
      );

      const ring = document.createElement("div");
      ring.className = "day-burst-ring";
      layer.appendChild(ring);
      ring.animate(
        [
          { opacity: 0.95, transform: "translate(-50%, -50%) scale(0.3)" },
          { opacity: 0.5, transform: "translate(-50%, -50%) scale(2.2)", offset: 0.65 },
          { opacity: 0, transform: "translate(-50%, -50%) scale(3.1)" },
        ],
        { duration: 1100, easing: "ease-out", fill: "forwards" },
      );

      const cx = window.innerWidth * 0.5;
      const cy = window.innerHeight * 0.42;
      const reach = Math.min(window.innerWidth, window.innerHeight) * 0.48;

      for (let i = 0; i < SPARK_COUNT; i += 1) {
        const spark = document.createElement("span");
        spark.className = "day-burst-spark";
        const size = 8 + Math.random() * 16;
        spark.style.width = `${size}px`;
        spark.style.height = `${size}px`;
        spark.style.color = HUES[i % HUES.length];
        spark.style.left = `${cx}px`;
        spark.style.top = `${cy}px`;
        layer.appendChild(spark);

        const angle = (Math.PI * 2 * i) / SPARK_COUNT + (Math.random() - 0.5) * 0.55;
        const dist = reach * (0.35 + Math.random() * 0.75);
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        const rot = 80 + Math.random() * 140;
        const delay = Math.random() * 180;

        spark.animate(
          [
            {
              opacity: 0,
              transform: "translate(-50%, -50%) scale(0.2) rotate(0deg)",
            },
            {
              opacity: 1,
              transform: `translate(calc(-50% + ${dx * 0.28}px), calc(-50% + ${dy * 0.28}px)) scale(1.25) rotate(${rot * 0.35}deg)`,
              offset: 0.16,
            },
            {
              opacity: 0,
              transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.35) rotate(${rot}deg)`,
            },
          ],
          {
            duration: 1400 + Math.random() * 500,
            delay,
            easing: "cubic-bezier(0.15, 0.75, 0.25, 1)",
            fill: "forwards",
          },
        );
      }

      hideTimer = window.setTimeout(() => {
        if (runId !== runIdRef.current) return;
        setShow(false);
      }, DURATION_MS);
    }, 0);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(hideTimer);
      layerRef.current?.replaceChildren();
    };
  }, [show, token]);

  if (!show || typeof document === "undefined") return null;

  return createPortal(<div className="day-burst" aria-hidden="true" ref={layerRef} />, document.body);
}
