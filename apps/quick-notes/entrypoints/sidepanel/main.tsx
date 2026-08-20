import { createRoot } from "react-dom/client";
import { QuickNotesApp } from "../../src/ui/QuickNotesApp";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found.");

createRoot(root).render(<QuickNotesApp defaultFilter="global" trackActivePage variant="panel" />);
