import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useState } from "react";

import { cn } from "../lib/cn";
import { Button, type ButtonProps } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type ConfirmActionProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  "aria-label": string;
  cancelLabel?: string;
  children: ReactNode;
  confirmLabel?: string;
  description: ReactNode;
  disabled?: boolean;
  onConfirm: () => Promise<void> | void;
  onConfirmError?: (error: unknown) => void;
  title: ReactNode;
  triggerClassName?: string;
  triggerSize?: ButtonProps["size"];
  triggerVariant?: ButtonProps["variant"];
};

export function ConfirmAction({
  "aria-label": ariaLabel,
  cancelLabel = "Cancel",
  children,
  className,
  confirmLabel = "Confirm",
  description,
  disabled,
  onConfirm,
  onConfirmError,
  title,
  triggerClassName,
  triggerSize = "icon",
  triggerVariant = "danger",
  ...props
}: ConfirmActionProps) {
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  async function confirm(): Promise<void> {
    if (isConfirming) return;

    setIsConfirming(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (error) {
      onConfirmError?.(error);
    } finally {
      setIsConfirming(false);
    }
  }

  function changeOpen(nextOpen: boolean): void {
    if (isConfirming) return;
    setOpen(nextOpen);
  }

  return (
    <div className={cn("relative", className)} {...props}>
      <Popover open={open} onOpenChange={changeOpen}>
        <PopoverTrigger asChild>
          <Button
            aria-label={ariaLabel}
            className={triggerClassName}
            disabled={disabled || isConfirming}
            size={triggerSize}
            type="button"
            variant={triggerVariant}
          >
            {children}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="grid w-64 gap-3 p-3">
          <div className="grid gap-1">
            <p className="text-sm font-bold text-[var(--extension-text)]">{title}</p>
            <p className="text-xs leading-relaxed text-[var(--extension-muted-strong)]">{description}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button disabled={isConfirming} size="sm" type="button" variant="secondary" onClick={() => setOpen(false)}>
              {cancelLabel}
            </Button>
            <Button disabled={isConfirming} size="sm" type="button" variant="danger" onClick={() => void confirm()}>
              {confirmLabel}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
