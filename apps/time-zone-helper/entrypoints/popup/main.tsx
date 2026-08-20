import { createRoot } from "react-dom/client";

import { TimeZoneHelperApp } from "../../src/ui/TimeZoneHelperApp";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found.");

createRoot(root).render(<TimeZoneHelperApp />);
