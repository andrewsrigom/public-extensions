import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";

export type IconBadgeProps = ComponentPropsWithoutRef<"span"> & {
  size?: "sm" | "md" | "lg";
};

export function IconBadge({ className, size = "md", ...props }: IconBadgeProps) {
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-[7px] bg-[color-mix(in_srgb,var(--extension-primary)_16%,transparent)] text-[var(--extension-primary)]",
        size === "sm" && "size-8",
        size === "md" && "size-9",
        size === "lg" && "size-12 rounded-[10px]",
        className
      )}
      {...props}
    />
  );
}
