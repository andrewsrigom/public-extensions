import type { ReactNode } from "react";

import { cn } from "../lib/cn";

export type FieldProps = {
  children: ReactNode;
  className?: string;
  label: ReactNode;
};

export function Field({ children, className, label }: FieldProps) {
  return (
    <label className={cn("grid gap-1.5 text-sm", className)}>
      <span className="text-xs font-semibold text-[var(--extension-muted)]">{label}</span>
      {children}
    </label>
  );
}
