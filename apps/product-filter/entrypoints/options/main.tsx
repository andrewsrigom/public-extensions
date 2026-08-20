import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ProductFilterOptions } from "../../src/ui/ProductFilterOptions";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <ProductFilterOptions />
  </StrictMode>
);
