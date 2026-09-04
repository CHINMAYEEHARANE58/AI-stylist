"use client";

import * as React from "react";
import { Download, Heart, RefreshCcw, Share2, Star } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { OutfitSuggestion } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OutfitCardProps {
  outfit: OutfitSuggestion;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
  index?: number;
}

export function OutfitCard({ outfit, isSaved = false, onToggleSave, index = 0 }: OutfitCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
    >
      <div className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card transition-shadow duration-300 hover:shadow-card-hover">
        {/* Visual mockup */}
        <div className="relative p-5 pb-0">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#faf4ed] to-[#e8d5bc] dark:from-[#1e1712] dark:to-[#362918] p-4">
            <div className="grid grid-cols-2 gap-2">
              {outfit.items.slice(0, 4).map((item) => (
                <div
                  key={item}
                  className="rounded-xl px-3 py-2.5 text-[11px] font-medium text-foreground/80 backdrop-blur-sm bg-background/70 border border-border/30"
                >
                  {item}
                </div>
              ))}
            </div>
            {outfit.accent && (
              <div className="mt-2 rounded-xl border border-dashed border-brand/40 bg-background/50 px-3 py-2 text-[11px] text-brand-dark">
                + {outfit.accent}
              </div>
            )}
          </div>

          {/* Confidence badge */}
          <div className="absolute right-7 top-7 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground shadow-sm">
            {outfit.score}%
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-display-sm">{outfit.title}</p>
              <p className="mt-1 text-label-xs">{outfit.occasion} · {outfit.mood}</p>
            </div>
            <Badge variant="muted" size="sm">{outfit.weather}</Badge>
          </div>

          <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{outfit.notes}</p>

          {/* Star rating */}
          <div className="mt-4 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={cn(
                  "h-4 w-4 transition-colors",
                  n <= 4 ? "fill-brand text-brand" : "text-muted",
                )}
              />
            ))}
            <span className="ml-2 text-xs text-muted-foreground">Rates future picks</span>
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border/50 pt-4">
            <Button
              size="sm"
              variant={isSaved ? "accent" : "default"}
              onClick={() => onToggleSave?.(outfit.id)}
            >
              <Heart className={cn("h-3.5 w-3.5", isSaved && "fill-current")} />
              {isSaved ? "Saved" : "Save"}
            </Button>
            <Button size="sm" variant="ghost">
              <RefreshCcw className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost">
              <Share2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
