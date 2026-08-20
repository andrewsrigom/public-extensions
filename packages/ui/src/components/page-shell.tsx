import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";

export type PageShellProps = ComponentPropsWithoutRef<"main"> & {
  width?: "md" | "lg" | "xl";
};

export function PageShell({ className, width = "lg", ...props }: PageShellProps) {
  return (
    <main
      className={cn(
        "mx-auto grid min-h-screen content-start gap-5 py-8",
        width === "md" && "w-[min(980px,calc(100vw_-_32px))]",
        width === "lg" && "w-[min(1180px,calc(100vw_-_40px))]",
        width === "xl" && "w-[min(1280px,calc(100vw_-_48px))]",
        className
      )}
      {...props}
    />
  );
}
