import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";

export type AppIconSize = "compact" | "header" | "page" | "panel";

export type AppIconProps = Omit<ComponentPropsWithoutRef<"img">, "src"> & {
  size?: AppIconSize;
  src: string;
};

const sizeClasses: Record<AppIconSize, string> = {
  compact: "size-9",
  header: "size-[52px]",
  page: "size-16",
  panel: "size-11"
};

export function AppIcon({ alt = "", className, draggable = false, size = "header", src, ...props }: AppIconProps) {
  return (
    <img
      alt={alt}
      className={cn("block shrink-0 scale-[1.2] object-contain", sizeClasses[size], className)}
      draggable={draggable}
      src={src}
      {...props}
    />
  );
}
