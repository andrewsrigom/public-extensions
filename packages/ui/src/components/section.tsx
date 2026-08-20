import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "../lib/cn";

export type SectionProps = Omit<ComponentPropsWithoutRef<"section">, "title"> & {
  actions?: ReactNode;
  subtitle?: ReactNode;
  title: ReactNode;
};

export function Section({ actions, children, className, subtitle, title, ...props }: SectionProps) {
  return (
    <section className={cn("grid gap-2.5", className)} {...props}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold tracking-normal text-[var(--extension-text)]">{title}</h2>
          {subtitle ? <p className="truncate text-xs font-semibold text-[var(--extension-muted)]">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
