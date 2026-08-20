import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useId } from "react";

import { cn } from "../lib/cn";

export type CheckboxFieldProps = Omit<ComponentPropsWithoutRef<"div">, "children" | "onChange"> & {
  checked: boolean;
  description?: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  onCheckedChange: (checked: boolean) => void;
};

export function CheckboxField({
  checked,
  className,
  description,
  disabled = false,
  label,
  onCheckedChange,
  ...props
}: CheckboxFieldProps) {
  const checkboxId = useId();

  return (
    <div
      className={cn(
        "grid min-h-[54px] grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 rounded-[7px] border border-[var(--extension-border)] bg-[var(--extension-surface-subtle)] p-2.5 data-[disabled=true]:opacity-60",
        className
      )}
      data-disabled={disabled}
      {...props}
    >
      <CheckboxPrimitive.Root
        checked={checked}
        className="grid size-[18px] shrink-0 place-items-center rounded-[5px] border border-[var(--extension-border-strong)] bg-[var(--extension-field)] text-[var(--extension-primary-contrast)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--extension-focus)] disabled:cursor-not-allowed data-[state=checked]:border-[var(--extension-primary)] data-[state=checked]:bg-[var(--extension-primary)]"
        disabled={disabled}
        id={checkboxId}
        onCheckedChange={(nextChecked) => {
          onCheckedChange(nextChecked === true);
        }}
      >
        <CheckboxPrimitive.Indicator>
          <Check aria-hidden="true" size={13} strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <label
        className="grid min-w-0 cursor-pointer gap-0.5 data-[disabled=true]:cursor-not-allowed"
        data-disabled={disabled}
        htmlFor={checkboxId}
      >
        <strong className="truncate text-sm text-[var(--extension-text)]">{label}</strong>
        {description ? (
          <small className="truncate text-xs font-medium text-[var(--extension-muted)]">{description}</small>
        ) : null}
      </label>
    </div>
  );
}
