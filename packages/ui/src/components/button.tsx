import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "../lib/cn";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[7px] border text-sm font-semibold tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--extension-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--extension-page)] disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: "default",
      variant: "primary"
    },
    variants: {
      size: {
        default: "h-9 px-3",
        icon: "size-9",
        sm: "h-8 px-2.5 text-xs"
      },
      variant: {
        danger:
          "border-[var(--extension-danger-border)] bg-[var(--extension-danger-surface)] text-[var(--extension-danger)] hover:bg-[color-mix(in_srgb,var(--extension-danger)_18%,transparent)]",
        ghost:
          "border-transparent bg-transparent text-[var(--extension-muted)] hover:bg-[var(--extension-surface-raised)] hover:text-[var(--extension-text)]",
        primary:
          "border-[var(--extension-primary)] bg-[var(--extension-primary)] text-[var(--extension-primary-contrast)] hover:bg-[var(--extension-primary-hover)]",
        secondary:
          "border-[var(--extension-border-strong)] bg-[var(--extension-surface)] text-[var(--extension-primary)] hover:bg-[var(--extension-surface-raised)]",
        subtle:
          "border-[var(--extension-border)] bg-[var(--extension-surface-subtle)] text-[var(--extension-text)] hover:bg-[var(--extension-surface-raised)]"
      }
    }
  }
);

export type ButtonProps = ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ asChild = false, className, size, variant, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";

  return <Component className={cn(buttonVariants({ size, variant }), className)} {...props} />;
}
