import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "../lib/cn";

export type AppFooterProps = ComponentPropsWithoutRef<"footer"> & {
  privacy?: ReactNode;
  version?: ReactNode;
};

export function AppFooter({ children, className, privacy, version, ...props }: AppFooterProps) {
  return (
    <footer
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-xs font-medium text-[var(--extension-muted)]",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <span className="truncate">{privacy}</span>
          <span className="truncate text-right">{version}</span>
        </>
      )}
    </footer>
  );
}
