import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";

export type StatusNoticeProps = ComponentPropsWithoutRef<"p"> & {
  tone?: "danger" | "neutral" | "success" | "warning";
};

export function StatusNotice({ className, tone = "neutral", ...props }: StatusNoticeProps) {
  return (
    <p
      className={cn(
        "rounded-[7px] border px-3 py-2 text-sm font-semibold",
        tone === "neutral" &&
          "border-[var(--extension-border)] bg-[var(--extension-surface-subtle)] text-[var(--extension-muted-strong)]",
        tone === "danger" &&
          "border-[var(--extension-danger-border)] bg-[var(--extension-danger-surface)] text-[var(--extension-danger)]",
        tone === "success" &&
          "border-[var(--extension-success-border)] bg-[var(--extension-success-surface)] text-[var(--extension-success)]",
        tone === "warning" &&
          "border-[var(--extension-warning-border)] bg-[var(--extension-warning-surface)] text-[var(--extension-warning)]",
        className
      )}
      {...props}
    />
  );
}
