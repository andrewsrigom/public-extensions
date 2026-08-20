import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "../lib/cn";
import { useExtensionPortalContainer } from "../portal";

export type DropdownMenuProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  "aria-label": string;
  align?: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>["align"];
  children: ReactNode;
  collisionPadding?: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>["collisionPadding"];
  panelClassName?: string;
  sideOffset?: number;
  summaryClassName?: string;
  trigger: ReactNode;
};

export function DropdownMenu({
  "aria-label": ariaLabel,
  align = "end",
  children,
  className,
  collisionPadding = 8,
  panelClassName,
  sideOffset = 6,
  summaryClassName,
  trigger,
  ...props
}: DropdownMenuProps) {
  const portalContainer = useExtensionPortalContainer();
  return (
    <div className={cn("relative", className)} {...props}>
      <DropdownMenuPrimitive.Root>
        <DropdownMenuPrimitive.Trigger asChild>
          <button
            aria-label={ariaLabel}
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-[7px] border border-[var(--extension-border-strong)] bg-[var(--extension-surface)] text-[var(--extension-text)] transition-colors hover:bg-[var(--extension-surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--extension-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--extension-page)] data-[state=open]:bg-[var(--extension-surface-raised)]",
              summaryClassName
            )}
            type="button"
          >
            {trigger}
          </button>
        </DropdownMenuPrimitive.Trigger>
        <DropdownMenuPrimitive.Portal container={portalContainer}>
          <DropdownMenuPrimitive.Content
            align={align}
            className={cn(
              "z-50 grid max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-52 gap-1 overflow-y-auto rounded-lg border border-[var(--extension-border)] bg-[color-mix(in_srgb,var(--extension-surface)_96%,black)] p-1.5 text-[var(--extension-text)] shadow-[0_16px_38px_rgba(0,0,0,0.32)] data-[side=bottom]:animate-in data-[state=closed]:animate-out",
              panelClassName
            )}
            collisionPadding={collisionPadding}
            sideOffset={sideOffset}
          >
            {children}
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
    </div>
  );
}

export type DropdownMenuItemProps = Omit<
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>,
  "children" | "onClick"
> & {
  children: ReactNode;
  danger?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
};

export function DropdownMenuItem({
  children,
  className,
  danger = false,
  icon,
  onClick,
  onSelect,
  ...props
}: DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "grid min-h-9 w-full cursor-pointer grid-cols-[18px_minmax(0,1fr)] items-center gap-2 rounded-[7px] px-2.5 text-left text-sm font-medium text-[var(--extension-text)] outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-[color-mix(in_srgb,var(--extension-primary)_16%,transparent)] data-[disabled]:opacity-50",
        danger && "text-[var(--extension-danger)] data-[highlighted]:bg-[var(--extension-danger-surface)]",
        className
      )}
      onSelect={(event) => {
        onSelect?.(event);
        if (!event.defaultPrevented) {
          onClick?.();
        }
      }}
      {...props}
    >
      <span className="inline-flex items-center justify-center text-[var(--extension-primary)]">{icon}</span>
      <span className="truncate">{children}</span>
    </DropdownMenuPrimitive.Item>
  );
}

export type DropdownMenuConfirmItemProps = Omit<DropdownMenuItemProps, "children" | "onClick"> & {
  children: ReactNode;
  confirmIcon?: ReactNode;
  confirmLabel: ReactNode;
  onConfirm: () => Promise<void> | void;
  onConfirmError?: (error: unknown) => void;
};

export function DropdownMenuConfirmItem({
  children,
  confirmIcon,
  confirmLabel,
  icon,
  onConfirm,
  onConfirmError,
  onSelect,
  ...props
}: DropdownMenuConfirmItemProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <DropdownMenuItem
      icon={isConfirming ? (confirmIcon ?? icon) : icon}
      onClick={() => {
        try {
          void Promise.resolve(onConfirm()).catch((error: unknown) => {
            onConfirmError?.(error);
          });
        } catch (error) {
          onConfirmError?.(error);
        }
      }}
      onSelect={(event) => {
        onSelect?.(event);
        if (event.defaultPrevented) return;

        if (!isConfirming) {
          event.preventDefault();
          setIsConfirming(true);
        }
      }}
      {...props}
    >
      {isConfirming ? confirmLabel : children}
    </DropdownMenuItem>
  );
}

export type DropdownMenuLabelProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
  icon?: ReactNode;
};

export function DropdownMenuLabel({ children, className, icon, ...props }: DropdownMenuLabelProps) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        "grid min-h-8 items-center gap-2 px-2.5 text-xs font-bold text-[var(--extension-muted)]",
        icon ? "grid-cols-[18px_minmax(0,1fr)]" : "grid-cols-[minmax(0,1fr)]",
        className
      )}
      {...props}
    >
      {icon ? <span className="inline-flex items-center justify-center">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </DropdownMenuPrimitive.Label>
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator className={cn("my-1 h-px bg-[var(--extension-border)]", className)} {...props} />
  );
}
