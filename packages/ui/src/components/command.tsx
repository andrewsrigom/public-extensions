import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import type { ComponentPropsWithoutRef, ElementRef, ReactNode } from "react";
import { forwardRef } from "react";

import { cn } from "../lib/cn";

export type CommandProps = ComponentPropsWithoutRef<typeof CommandPrimitive>;

export const Command = forwardRef<ElementRef<typeof CommandPrimitive>, CommandProps>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn("grid overflow-hidden rounded-lg bg-transparent text-[var(--extension-text)]", className)}
    {...props}
  />
));
Command.displayName = "Command";

export type CommandInputProps = ComponentPropsWithoutRef<typeof CommandPrimitive.Input>;

export const CommandInput = forwardRef<ElementRef<typeof CommandPrimitive.Input>, CommandInputProps>(
  ({ className, ...props }, ref) => (
    <div
      className="grid h-10 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border-b border-[var(--extension-border)] px-3"
      cmdk-input-wrapper=""
    >
      <Search aria-hidden="true" className="text-[var(--extension-muted)]" size={15} strokeWidth={2.35} />
      <CommandPrimitive.Input
        ref={ref}
        className={cn(
          "h-9 min-w-0 border-0 bg-transparent text-sm text-[var(--extension-text)] outline-none placeholder:text-[var(--extension-placeholder)]",
          className
        )}
        {...props}
      />
    </div>
  )
);
CommandInput.displayName = "CommandInput";

export type CommandListProps = ComponentPropsWithoutRef<typeof CommandPrimitive.List>;

export const CommandList = forwardRef<ElementRef<typeof CommandPrimitive.List>, CommandListProps>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.List
      ref={ref}
      className={cn("max-h-72 overflow-y-auto overflow-x-hidden p-1", className)}
      {...props}
    />
  )
);
CommandList.displayName = "CommandList";

export type CommandEmptyProps = ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>;

export const CommandEmpty = forwardRef<ElementRef<typeof CommandPrimitive.Empty>, CommandEmptyProps>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Empty
      ref={ref}
      className={cn("py-6 text-center text-sm font-medium text-[var(--extension-muted)]", className)}
      {...props}
    />
  )
);
CommandEmpty.displayName = "CommandEmpty";

export type CommandGroupProps = ComponentPropsWithoutRef<typeof CommandPrimitive.Group> & {
  heading?: ReactNode;
};

export const CommandGroup = forwardRef<ElementRef<typeof CommandPrimitive.Group>, CommandGroupProps>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Group
      ref={ref}
      className={cn(
        "overflow-hidden p-1 text-[var(--extension-text)] [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:text-[var(--extension-muted)]",
        className
      )}
      {...props}
    />
  )
);
CommandGroup.displayName = "CommandGroup";

export type CommandItemProps = ComponentPropsWithoutRef<typeof CommandPrimitive.Item>;

export const CommandItem = forwardRef<ElementRef<typeof CommandPrimitive.Item>, CommandItemProps>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Item
      ref={ref}
      className={cn(
        "relative grid min-h-9 cursor-pointer select-none grid-cols-[18px_minmax(0,1fr)] items-center gap-2 rounded-[7px] px-2 text-sm font-medium outline-none transition-colors aria-selected:bg-[color-mix(in_srgb,var(--extension-primary)_16%,transparent)] data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
        className
      )}
      {...props}
    />
  )
);
CommandItem.displayName = "CommandItem";

export type CommandSeparatorProps = ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>;

export const CommandSeparator = forwardRef<ElementRef<typeof CommandPrimitive.Separator>, CommandSeparatorProps>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Separator
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-[var(--extension-border)]", className)}
      {...props}
    />
  )
);
CommandSeparator.displayName = "CommandSeparator";
