import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useId } from "react";

import { cn } from "../lib/cn";

export type DropdownMenuSwitchItemProps = Omit<ComponentPropsWithoutRef<"div">, "children" | "onChange"> & {
  checked: boolean;
  label: ReactNode;
  onCheckedChange: (checked: boolean) => void;
};

export function DropdownMenuSwitchItem({
  checked,
  className,
  label,
  onCheckedChange,
  ...props
}: DropdownMenuSwitchItemProps) {
  const switchId = useId();

  return (
    <div className={cn("flex items-center justify-between gap-3 px-2 py-1.5", className)} {...props}>
      <label
        className="min-w-0 cursor-pointer truncate text-sm font-semibold text-[var(--extension-text)]"
        htmlFor={switchId}
      >
        {label}
      </label>
      <SwitchPrimitive.Root
        checked={checked}
        className="relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-[var(--extension-border-strong)] bg-[var(--extension-field)] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--extension-focus)] data-[state=checked]:border-[var(--extension-primary)] data-[state=checked]:bg-[var(--extension-primary)]"
        id={switchId}
        onCheckedChange={onCheckedChange}
      >
        <SwitchPrimitive.Thumb className="block size-4 translate-x-1 rounded-full bg-[var(--extension-muted-strong)] transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-[var(--extension-primary-contrast)]" />
      </SwitchPrimitive.Root>
    </div>
  );
}
