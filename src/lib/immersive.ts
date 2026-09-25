/** Android PWA: soğuk açılışta siyah status bar kalmasın diye immersive fullscreen zorla. */

type FullscreenEl = HTMLElement & {
  webkitRequestFullscreen?: (options?: FullscreenOptions) => Promise<void> | void;
};

function requestImmersive(): void {
  if (typeof document === "undefined") return;
  if (document.fullscreenElement) return;

  const root = document.documentElement as FullscreenEl;
  const request = root.requestFullscreen?.bind(root) ?? root.webkitRequestFullscreen?.bind(root);
  if (!request) return;

  try {
    const result = request({ navigationUI: "hide" });
    if (result && typeof result.catch === "function") {
      result.catch(() => {
        /* jesture yoksa tarayıcı reddedebilir; etkileşimde yeniden deneriz */
      });
    }
  } catch {
    /* yok say */
  }

  try {
    void screen.orientation?.lock?.("portrait").catch(() => undefined);
  } catch {
    /* yok say */
  }
}

export function initImmersive(): void {
  const tryEnter = () => requestImmersive();

  tryEnter();
  queueMicrotask(tryEnter);
  window.setTimeout(tryEnter, 0);
  window.setTimeout(tryEnter, 120);
  window.setTimeout(tryEnter, 400);

  window.addEventListener("pageshow", tryEnter);
  window.addEventListener("focus", tryEnter);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") tryEnter();
  });

  window.addEventListener("pointerdown", tryEnter, { capture: true });
  window.addEventListener("touchstart", tryEnter, { capture: true, passive: true });
  window.addEventListener("keydown", tryEnter, { capture: true });
}
