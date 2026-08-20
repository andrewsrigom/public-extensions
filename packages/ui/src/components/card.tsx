import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";

export type CardProps = ComponentPropsWithoutRef<"article">;

export function Card({ className, ...props }: CardProps) {
  return (
    <article
      className={cn(
        "rounded-lg border border-[var(--extension-border)] bg-[var(--extension-surface)] shadow-none",
        className
      )}
      {...props}
    />
  );
}
