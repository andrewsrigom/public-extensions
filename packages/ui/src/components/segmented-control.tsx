import type { ReactNode } from "react";

import { cn } from "../lib/cn";

export type SegmentedControlOption<TValue extends string> = {
  disabled?: boolean;
  label: ReactNode;
  value: TValue;
};

export type SegmentedControlProps<TValue extends string> = {
  "aria-label": string;
  className?: string;
  onValueChange: (value: TValue) => void;
  options: ReadonlyArray<SegmentedControlOption<TValue>>;
  value: TValue;
};

export function SegmentedControl<TValue extends string>({
  "aria-label": ariaLabel,
  className,
  onValueChange,
  options,
  value
}: SegmentedControlProps<TValue>) {
  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "grid overflow-hidden rounded-[8px] border border-[var(--extension-border)] bg-[var(--extension-surface-subtle)]",
        className
      )}
      role="group"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          aria-pressed={value === option.value}
          className="min-h-10 border-0 border-l border-[var(--extension-border)] bg-transparent px-2 text-sm font-bold text-[var(--extension-muted)] first:border-l-0 hover:bg-[var(--extension-surface-raised)] disabled:pointer-events-none disabled:opacity-50 aria-pressed:bg-[var(--extension-primary)] aria-pressed:text-[var(--extension-primary-contrast)]"
          disabled={option.disabled}
          key={option.value}
          type="button"
          onClick={() => {
            onValueChange(option.value);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
