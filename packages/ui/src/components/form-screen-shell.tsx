import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "../lib/cn";

export type FormScreenShellProps = ComponentPropsWithoutRef<"form"> & {
  footer: ReactNode;
  header: ReactNode;
};

export function FormScreenShell({ children, className, footer, header, ...props }: FormScreenShellProps) {
  return (
    <form className={cn("grid min-h-full grid-rows-[auto_minmax(0,1fr)_auto]", className)} {...props}>
      {header}
      <div className="grid content-start gap-4 overflow-y-auto p-3.5">{children}</div>
      {footer}
    </form>
  );
}
