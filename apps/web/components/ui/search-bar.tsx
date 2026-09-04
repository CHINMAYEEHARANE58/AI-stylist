"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  containerClassName?: string;
}

const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, containerClassName, onClear, value, ...props }, ref) => {
    return (
      <div className={cn("relative flex items-center", containerClassName)}>
        <Search className="pointer-events-none absolute left-4 h-4 w-4 text-muted-foreground" />
        <input
          ref={ref}
          value={value}
          className={cn(
            "h-11 w-full rounded-2xl border border-border bg-background pl-11 pr-10 text-sm",
            "placeholder:text-muted-foreground/60 transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring",
            className,
          )}
          {...props}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  },
);
SearchBar.displayName = "SearchBar";

export { SearchBar };
