import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";

export type SidePanelShellProps = ComponentPropsWithoutRef<"main">;

export function SidePanelShell({ className, ...props }: SidePanelShellProps) {
  return <main className={cn("grid min-h-screen content-start gap-3.5 p-4", className)} {...props} />;
}
