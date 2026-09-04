import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border border-border/80 bg-secondary text-secondary-foreground",
        primary:
          "bg-primary text-primary-foreground",
        accent:
          "bg-brand/20 text-brand-dark border border-brand/30",
        success:
          "bg-success/10 text-success border border-success/20",
        warning:
          "bg-warning/10 text-warning border border-warning/20",
        destructive:
          "bg-destructive/10 text-destructive border border-destructive/20",
        outline:
          "border border-border bg-transparent text-foreground",
        muted:
          "bg-muted text-muted-foreground",
      },
      size: {
        sm:      "px-2 py-0.5 text-[10px]",
        default: "px-2.5 py-1 text-xs",
        lg:      "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
