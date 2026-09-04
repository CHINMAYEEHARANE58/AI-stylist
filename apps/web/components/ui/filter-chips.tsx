"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface FilterChipsProps {
  options: string[];
  selected: string[];
  onChange: (value: string[]) => void;
  multi?: boolean;
  className?: string;
}

export function FilterChips({ options, selected, onChange, multi = true, className }: FilterChipsProps) {
  function toggle(option: string) {
    if (multi) {
      onChange(
        selected.includes(option)
          ? selected.filter((s) => s !== option)
          : [...selected, option],
      );
    } else {
      onChange(selected.includes(option) ? [] : [option]);
    }
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={cn(
              "inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-medium",
              "transition-all duration-150 cursor-pointer select-none",
              active
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
