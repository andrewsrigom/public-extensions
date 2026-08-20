import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";

export type InputProps = ComponentPropsWithoutRef<"input">;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full min-w-0 rounded-[7px] border border-[var(--extension-border-strong)] bg-[var(--extension-field)] px-3 text-sm text-[var(--extension-text)] outline-none transition-colors placeholder:text-[var(--extension-placeholder)] focus:border-[var(--extension-focus)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--extension-focus)_24%,transparent)]",
        className
      )}
      {...props}
    />
  );
}
