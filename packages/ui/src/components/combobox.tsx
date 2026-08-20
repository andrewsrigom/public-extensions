import { Check, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { cn } from "../lib/cn";
import { Button } from "./button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type ComboboxOption<TValue extends string> = {
  disabled?: boolean;
  keywords?: string[];
  label: ReactNode;
  searchValue?: string;
  value: TValue;
};

export type ComboboxProps<TValue extends string> = {
  "aria-label": string;
  className?: string;
  contentClassName?: string;
  emptyLabel?: string;
  onValueChange: (value: TValue) => void;
  options: ReadonlyArray<ComboboxOption<TValue>>;
  placeholder?: string;
  searchPlaceholder?: string;
  triggerClassName?: string;
  value: TValue;
};

export function Combobox<TValue extends string>({
  "aria-label": ariaLabel,
  className,
  contentClassName,
  emptyLabel = "",
  onValueChange,
  options,
  placeholder = ariaLabel,
  searchPlaceholder = ariaLabel,
  triggerClassName,
  value
}: ComboboxProps<TValue>) {
  const [open, setOpen] = useState(false);
  const selectedOption = useMemo(() => options.find((option) => option.value === value), [options, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          aria-label={ariaLabel}
          className={cn("w-full justify-between px-3", triggerClassName, className)}
          role="combobox"
          type="button"
          variant="subtle"
        >
          <span className={cn("min-w-0 truncate", !selectedOption && "text-[var(--extension-placeholder)]")}>
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronsUpDown aria-hidden="true" className="shrink-0 text-[var(--extension-muted)]" size={15} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn("w-[var(--radix-popover-trigger-width)] p-0", contentClassName)}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            {emptyLabel ? <CommandEmpty>{emptyLabel}</CommandEmpty> : null}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  disabled={option.disabled}
                  key={option.value}
                  keywords={option.keywords}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  value={option.searchValue ?? String(option.label)}
                >
                  <Check
                    aria-hidden="true"
                    className={cn(
                      "text-[var(--extension-primary)]",
                      selectedOption?.value === option.value ? "opacity-100" : "opacity-0"
                    )}
                    size={15}
                    strokeWidth={2.35}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
