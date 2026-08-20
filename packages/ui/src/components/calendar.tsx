import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "../lib/cn";

export type CalendarProps = ComponentProps<typeof DayPicker>;

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      className={cn("p-2", className)}
      classNames={{
        ...defaultClassNames,
        root: cn(defaultClassNames.root, "text-[var(--extension-text)]"),
        months: cn(defaultClassNames.months, "grid gap-3"),
        month: cn(defaultClassNames.month, "space-y-3"),
        month_caption: cn(defaultClassNames.month_caption, "relative flex h-9 items-center justify-center"),
        caption_label: cn(defaultClassNames.caption_label, "text-sm font-bold"),
        nav: cn(defaultClassNames.nav, "absolute inset-x-0 top-2 flex items-center justify-between px-2"),
        button_previous: cn(
          defaultClassNames.button_previous,
          "inline-flex size-7 items-center justify-center rounded-[7px] border border-[var(--extension-border)] bg-[var(--extension-surface-subtle)] text-[var(--extension-muted)] transition-colors hover:bg-[var(--extension-surface-raised)] hover:text-[var(--extension-text)]"
        ),
        button_next: cn(
          defaultClassNames.button_next,
          "inline-flex size-7 items-center justify-center rounded-[7px] border border-[var(--extension-border)] bg-[var(--extension-surface-subtle)] text-[var(--extension-muted)] transition-colors hover:bg-[var(--extension-surface-raised)] hover:text-[var(--extension-text)]"
        ),
        month_grid: cn(defaultClassNames.month_grid, "w-full border-collapse"),
        weekdays: cn(defaultClassNames.weekdays, "grid grid-cols-7"),
        weekday: cn(
          defaultClassNames.weekday,
          "grid h-8 place-items-center text-xs font-bold text-[var(--extension-muted)]"
        ),
        week: cn(defaultClassNames.week, "grid grid-cols-7"),
        day: cn(defaultClassNames.day, "grid size-8 place-items-center p-0 text-center text-sm"),
        day_button: cn(
          defaultClassNames.day_button,
          "grid size-8 place-items-center rounded-[7px] border border-transparent text-sm font-semibold text-[var(--extension-text)] outline-none transition-colors hover:bg-[var(--extension-surface-raised)] focus-visible:ring-2 focus-visible:ring-[var(--extension-focus)]"
        ),
        today: cn(defaultClassNames.today, "[&>button]:border-[var(--extension-primary)]"),
        selected: cn(
          defaultClassNames.selected,
          "[&>button]:bg-[var(--extension-primary)] [&>button]:text-[var(--extension-primary-contrast)]"
        ),
        outside: cn(defaultClassNames.outside, "text-[var(--extension-placeholder)] opacity-65"),
        disabled: cn(defaultClassNames.disabled, "pointer-events-none opacity-45"),
        hidden: cn(defaultClassNames.hidden, "invisible"),
        ...classNames
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft aria-hidden="true" size={15} strokeWidth={2.4} />
          ) : (
            <ChevronRight aria-hidden="true" size={15} strokeWidth={2.4} />
          )
      }}
      showOutsideDays={showOutsideDays}
      {...props}
    />
  );
}
