import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";

export type ActionFooterProps = ComponentPropsWithoutRef<"footer"> & {
  columns?: 2 | 3;
};

export function ActionFooter({ className, columns = 2, ...props }: ActionFooterProps) {
  return (
    <footer
      className={cn(
        "grid gap-2 border-t border-[var(--extension-border)] p-3.5",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        className
      )}
      {...props}
    />
  );
}
