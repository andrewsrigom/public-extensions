import { createRoot } from "react-dom/client";

import { PathSwitchApp } from "../../src/ui/PathSwitchApp";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found.");

createRoot(root).render(<PathSwitchApp />);
