import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { FontProvider } from "./lib/font";
import { initImmersive } from "./lib/immersive";
import "./index.css";

initImmersive();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FontProvider>
      <App />
    </FontProvider>
  </StrictMode>,
);
