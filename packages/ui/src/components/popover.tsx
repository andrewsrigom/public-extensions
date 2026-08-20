import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";
import { useExtensionPortalContainer } from "../portal";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export type PopoverContentProps = ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>;

export function PopoverContent({ align = "center", className, sideOffset = 6, ...props }: PopoverContentProps) {
  const portalContainer = useExtensionPortalContainer();
  return (
    <PopoverPrimitive.Portal container={portalContainer}>
      <PopoverPrimitive.Content
        align={align}
        className={cn(
          "z-50 rounded-lg border border-[var(--extension-border)] bg-[color-mix(in_srgb,var(--extension-surface)_96%,black)] p-1.5 text-[var(--extension-text)] shadow-[0_16px_38px_rgba(0,0,0,0.32)] outline-none data-[side=bottom]:animate-in data-[state=closed]:animate-out",
          className
        )}
        sideOffset={sideOffset}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
