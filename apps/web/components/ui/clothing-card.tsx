"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MoreHorizontal, Sparkles, Star } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ClothingItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

interface ClothingCardProps {
  item: ClothingItem;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  index?: number;
  href?: string;
}

export function ClothingCard({ item, isFavorite = false, onToggleFavorite, index = 0, href }: ClothingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group masonry-item"
    >
      <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card transition-shadow duration-300 hover:shadow-card-hover">
        {/* Image */}
        <div className="relative overflow-hidden bg-muted">
          {href ? (
            <Link href={href}>
              <Image
                src={item.image}
                alt={item.name}
                width={600}
                height={750}
                className="w-full object-cover transition-transform duration-500 ease-snappy group-hover:scale-[1.04]"
              />
            </Link>
          ) : (
            <Image
              src={item.image}
              alt={item.name}
              width={600}
              height={750}
              className="w-full object-cover transition-transform duration-500 ease-snappy group-hover:scale-[1.04]"
            />
          )}

          {/* Top controls */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
            <Badge variant="muted" size="sm" className="backdrop-blur-md bg-background/70 border-0">
              {item.category}
            </Badge>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => onToggleFavorite?.(item.id)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  "bg-background/80 backdrop-blur-md border border-border/40",
                  "transition-all duration-200 hover:scale-110",
                  isFavorite ? "text-rose-500" : "text-muted-foreground hover:text-rose-500",
                )}
                aria-label="Toggle favourite"
              >
                <Heart className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-md border border-border/40 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="More options"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* "Style this item" hover action */}
          <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <Link
              href={`/style-item/${item.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary/90 px-3 py-2.5 text-xs font-medium text-primary-foreground backdrop-blur-md"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Style this item
            </Link>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{item.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.brand} · {item.color}</p>
            </div>
            {item.favorite && (
              <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-current text-brand" />
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[item.season, item.occasion].map((label) => (
              <span key={label} className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] text-muted-foreground">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
