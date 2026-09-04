"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-medium transition-all duration-200 focus-visible:outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-40 select-none",
    "active:scale-[0.97]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
        accent:
          "bg-brand text-brand-ink shadow-sm hover:bg-brand-dark hover:shadow-md font-semibold",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-accent/40 hover:border-border/80",
        ghost:
          "text-foreground hover:bg-accent/40 hover:text-foreground",
        link:
          "text-foreground underline-offset-4 hover:underline p-0 h-auto",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        muted:
          "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      },
      size: {
        xs:      "h-7 rounded-lg px-2.5 text-[11px]",
        sm:      "h-8 rounded-xl px-3.5 text-xs",
        default: "h-10 rounded-xl px-5 text-sm",
        lg:      "h-12 rounded-2xl px-7 text-sm",
        xl:      "h-14 rounded-2xl px-8 text-base",
        icon:    "h-10 w-10 rounded-xl",
        "icon-sm": "h-8 w-8 rounded-lg",
        "icon-lg": "h-12 w-12 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
