import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, id, ...props }, ref) => {
    const textareaId = id ?? React.useId();
    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-label-sm text-foreground">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            "flex min-h-[90px] w-full rounded-xl border border-input bg-background px-3.5 py-3",
            "text-sm placeholder:text-muted-foreground/60",
            "transition-all duration-200 resize-none",
            "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus:ring-destructive/30",
            className,
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
