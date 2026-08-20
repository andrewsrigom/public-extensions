import type { ReactNode } from "react";

import { cn } from "../lib/cn";

export type AppHeaderProps = {
  actions?: ReactNode;
  className?: string;
  icon?: ReactNode;
  subtitle?: ReactNode;
  title: ReactNode;
};

export function AppHeader({ actions, className, icon, subtitle, title }: AppHeaderProps) {
  return (
    <header className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3", className)}>
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5">
        {icon ? <span className="grid shrink-0 place-items-center">{icon}</span> : null}
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-[820] leading-tight tracking-normal text-[var(--extension-text)]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 truncate text-[13px] leading-snug text-[var(--extension-muted)]">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
