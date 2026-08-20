import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";

export type PopupShellProps = ComponentPropsWithoutRef<"main">;

export function PopupShell({ className, ...props }: PopupShellProps) {
  return <main className={cn("grid min-h-full gap-3 p-3.5", className)} {...props} />;
}
