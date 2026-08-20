import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { SiteResetApp } from "../../src/ui/SiteResetApp";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found.");

createRoot(root).render(
  <StrictMode>
    <SiteResetApp />
  </StrictMode>
);
