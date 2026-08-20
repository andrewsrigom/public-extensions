import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { WatchedFilterPopup } from "../../src/ui/WatchedFilterPopup";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <WatchedFilterPopup />
  </StrictMode>
);
