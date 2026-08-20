import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";

export type EmptyStateProps = ComponentPropsWithoutRef<"div">;

export function EmptyState({ className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-[var(--extension-border-strong)] bg-[var(--extension-surface-subtle)] px-3 py-3 text-center text-sm font-semibold text-[var(--extension-muted)]",
        className
      )}
      {...props}
    />
  );
}
