import { Search } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";

export type SearchFieldProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  shortcut?: string;
  wrapperClassName?: string;
};

export function SearchField({ className, shortcut, wrapperClassName, ...props }: SearchFieldProps) {
  return (
    <label
      className={cn(
        "grid h-10 grid-cols-[auto_minmax(0,1fr)_auto] items-center rounded-[7px] border border-[var(--extension-border-strong)] bg-[var(--extension-field)] px-3 text-[var(--extension-muted)] focus-within:border-[var(--extension-focus)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--extension-focus)_24%,transparent)]",
        wrapperClassName
      )}
    >
      <Search aria-hidden size={17} strokeWidth={2.35} />
      <input
        className={cn(
          "h-full min-w-0 border-0 bg-transparent px-2 text-sm font-medium text-[var(--extension-text)] outline-none placeholder:text-[var(--extension-placeholder)]",
          className
        )}
        type="search"
        {...props}
      />
      {shortcut ? (
        <kbd className="rounded-[6px] bg-[var(--extension-surface-subtle)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--extension-muted)]">
          {shortcut}
        </kbd>
      ) : null}
    </label>
  );
}
