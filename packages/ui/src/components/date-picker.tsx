import { CalendarIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "../lib/cn";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type DatePickerProps = {
  "aria-label": string;
  className?: string;
  disabled?: boolean;
  locale?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

export function DatePicker({
  "aria-label": ariaLabel,
  className,
  disabled = false,
  locale,
  onValueChange,
  placeholder = ariaLabel,
  value
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDateValue(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-label={ariaLabel}
          className={cn(
            "w-full justify-between px-3",
            !selectedDate && "text-[var(--extension-placeholder)]",
            className
          )}
          disabled={disabled}
          type="button"
          variant="subtle"
        >
          <span className="min-w-0 truncate">{selectedDate ? formatDateLabel(selectedDate, locale) : placeholder}</span>
          <CalendarIcon aria-hidden="true" className="shrink-0 text-[var(--extension-muted)]" size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          autoFocus
          mode="single"
          onSelect={(date) => {
            if (!date) return;
            onValueChange(formatDateValue(date));
            setOpen(false);
          }}
          selected={selectedDate}
        />
      </PopoverContent>
    </Popover>
  );
}

function parseDateValue(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }

  return date;
}

function formatDateValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateLabel(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
