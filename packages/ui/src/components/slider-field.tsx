import * as SliderPrimitive from "@radix-ui/react-slider";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "../lib/cn";

export type SliderFieldMark = {
  label: ReactNode;
  value: number;
};

export type SliderFieldProps = Omit<
  ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
  "children" | "defaultValue" | "onValueChange" | "value"
> & {
  label: ReactNode;
  marks?: ReadonlyArray<SliderFieldMark>;
  onValueChange: (value: number) => void;
  value: number;
  valueLabel?: ReactNode;
};

export function SliderField({
  className,
  disabled = false,
  label,
  marks,
  max,
  min,
  onValueChange,
  step,
  value,
  valueLabel,
  ...props
}: SliderFieldProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[var(--extension-text)]">
        <span className="min-w-0 truncate">{label}</span>
        {valueLabel ? (
          <output className="rounded-[7px] bg-[var(--extension-surface-raised)] px-2 py-1 text-xs font-bold text-[var(--extension-primary)]">
            {valueLabel}
          </output>
        ) : null}
      </div>
      <SliderPrimitive.Root
        className="relative flex h-5 w-full touch-none select-none items-center data-[disabled]:opacity-60"
        disabled={disabled}
        max={max}
        min={min}
        onValueChange={(nextValue) => {
          const [next] = nextValue;
          if (typeof next === "number") {
            onValueChange(next);
          }
        }}
        step={step}
        value={[value]}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-[var(--extension-field)]">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-[var(--extension-primary)]" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          aria-label={typeof label === "string" ? label : undefined}
          className="block size-4 rounded-full border border-[var(--extension-primary)] bg-[var(--extension-text)] shadow-sm outline-none transition-transform focus-visible:ring-2 focus-visible:ring-[var(--extension-focus)] disabled:pointer-events-none"
        />
      </SliderPrimitive.Root>
      {marks ? (
        <div className="flex justify-between text-xs font-medium text-[var(--extension-muted)]" aria-hidden="true">
          {marks.map((mark) => (
            <span key={mark.value}>{mark.label}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
