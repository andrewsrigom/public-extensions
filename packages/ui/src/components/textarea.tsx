import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";

export type TextareaProps = ComponentPropsWithoutRef<"textarea">;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "min-h-40 w-full min-w-0 resize-y rounded-[7px] border border-[var(--extension-border-strong)] bg-[var(--extension-field)] px-3 py-2.5 text-sm leading-relaxed text-[var(--extension-text)] outline-none transition-colors placeholder:text-[var(--extension-placeholder)] focus:border-[var(--extension-focus)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--extension-focus)_24%,transparent)]",
        className
      )}
      {...props}
    />
  );
}
