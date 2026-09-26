import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { FontProvider } from "./lib/font";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FontProvider>
      <App />
    </FontProvider>
  </StrictMode>,
);
