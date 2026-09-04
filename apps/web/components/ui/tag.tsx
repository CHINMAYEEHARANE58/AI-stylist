"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  onRemove?: () => void;
  selected?: boolean;
}

function Tag({ className, children, onRemove, selected, onClick, ...props }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium",
        "transition-all duration-150 cursor-pointer select-none",
        selected
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border bg-background text-foreground hover:bg-accent/40",
        className,
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick(e as unknown as React.MouseEvent<HTMLSpanElement>) : undefined}
      {...props}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full hover:opacity-70"
          aria-label="Remove tag"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

export { Tag };
