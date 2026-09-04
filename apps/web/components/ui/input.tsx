"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leftIcon, rightIcon, error, label, id, ...props }, ref) => {
    const uid = React.useId();
    const inputId = id ?? uid;
    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="pointer-events-none absolute left-3.5 flex h-4 w-4 items-center justify-center text-muted-foreground">
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            type={type}
            className={cn(
              "flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2",
              "text-sm placeholder:text-muted-foreground/60",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              error && "border-destructive focus:ring-destructive/30",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              className,
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3.5 flex h-4 w-4 items-center justify-center text-muted-foreground">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
