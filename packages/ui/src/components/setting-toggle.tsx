import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useId } from "react";

import { cn } from "../lib/cn";

export type SettingToggleProps = Omit<ComponentPropsWithoutRef<"div">, "children" | "onChange" | "title"> & {
  checked: boolean;
  description?: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  onCheckedChange: (checked: boolean) => void;
  tone?: "default" | "neutral" | "success" | "warning";
};

export function SettingToggle({
  checked,
  className,
  description,
  disabled = false,
  label,
  onCheckedChange,
  tone = "default",
  ...props
}: SettingToggleProps) {
  const switchId = useId();

  return (
    <div
      className={cn(
        "grid min-h-[56px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 data-[disabled=true]:opacity-60",
        className
      )}
      data-disabled={disabled}
      {...props}
    >
      <label
        className="grid min-w-0 cursor-pointer gap-1 data-[disabled=true]:cursor-not-allowed"
        data-disabled={disabled}
        htmlFor={switchId}
      >
        <span className="truncate text-sm font-bold text-[var(--extension-text)]">{label}</span>
        {description ? (
          <span className="text-xs font-medium leading-snug text-[var(--extension-muted)]">{description}</span>
        ) : null}
      </label>
      <SwitchPrimitive.Root
        checked={checked}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-[var(--extension-border-strong)] bg-[var(--extension-field)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--extension-focus)] disabled:cursor-not-allowed disabled:opacity-70 data-[state=checked]:border-[var(--extension-primary)] data-[state=checked]:bg-[var(--extension-primary)]",
          tone === "success" &&
            "data-[state=checked]:border-[var(--extension-success)] data-[state=checked]:bg-[var(--extension-success)]",
          tone === "warning" &&
            "data-[state=checked]:border-[var(--extension-warning)] data-[state=checked]:bg-[var(--extension-warning)]",
          tone === "neutral" &&
            "data-[state=checked]:border-[var(--extension-neutral-accent)] data-[state=checked]:bg-[var(--extension-neutral-accent)]"
        )}
        disabled={disabled}
        id={switchId}
        onCheckedChange={onCheckedChange}
      >
        <SwitchPrimitive.Thumb className="block size-5 translate-x-1 rounded-full bg-[var(--extension-muted-strong)] transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-[var(--extension-primary-contrast)]" />
      </SwitchPrimitive.Root>
    </div>
  );
}
