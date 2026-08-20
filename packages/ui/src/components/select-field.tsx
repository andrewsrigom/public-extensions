import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { useId, type ReactNode } from "react";

import { cn } from "../lib/cn";
import { useExtensionPortalContainer } from "../portal";

export type SelectFieldOption<TValue extends string> = {
  disabled?: boolean;
  label: ReactNode;
  value: TValue;
};

export type SelectFieldProps<TValue extends string> = {
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
  label: ReactNode;
  onValueChange: (value: TValue) => void;
  options: ReadonlyArray<SelectFieldOption<TValue>>;
  placeholder?: string;
  triggerClassName?: string;
  value: TValue;
};

export function SelectField<TValue extends string>({
  className,
  contentClassName,
  disabled = false,
  label,
  onValueChange,
  options,
  placeholder,
  triggerClassName,
  value
}: SelectFieldProps<TValue>) {
  const portalContainer = useExtensionPortalContainer();
  const labelId = useId();

  return (
    <div className={cn("grid gap-1.5 text-sm", className)}>
      <span className="text-xs font-semibold text-[var(--extension-muted)]" id={labelId}>
        {label}
      </span>
      <SelectPrimitive.Root
        disabled={disabled}
        onValueChange={(nextValue) => {
          onValueChange(nextValue as TValue);
        }}
        value={value}
      >
        <SelectPrimitive.Trigger
          aria-labelledby={labelId}
          className={cn(
            "flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-[7px] border border-[var(--extension-border-strong)] bg-[var(--extension-field)] px-3 text-left text-sm font-medium text-[var(--extension-text)] outline-none transition-colors placeholder:text-[var(--extension-placeholder)] focus:border-[var(--extension-focus)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--extension-focus)_24%,transparent)] disabled:pointer-events-none disabled:opacity-50",
            triggerClassName
          )}
          type="button"
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown aria-hidden="true" className="shrink-0 text-[var(--extension-muted)]" size={16} />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal container={portalContainer}>
          <SelectPrimitive.Content
            className={cn(
              "z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-[var(--extension-border)] bg-[color-mix(in_srgb,var(--extension-surface)_96%,black)] p-1.5 text-[var(--extension-text)] shadow-[0_16px_38px_rgba(0,0,0,0.32)]",
              contentClassName
            )}
            position="popper"
            sideOffset={6}
          >
            <SelectPrimitive.Viewport className="grid gap-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  className="grid min-h-8 cursor-pointer grid-cols-[18px_minmax(0,1fr)] items-center gap-2 rounded-[7px] px-2 text-sm font-medium outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-[color-mix(in_srgb,var(--extension-primary)_16%,transparent)] data-[disabled]:opacity-50"
                  disabled={option.disabled}
                  key={option.value}
                  value={option.value}
                >
                  <SelectPrimitive.ItemIndicator className="inline-flex items-center justify-center text-[var(--extension-primary)]">
                    <Check aria-hidden="true" size={15} strokeWidth={2.35} />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}
