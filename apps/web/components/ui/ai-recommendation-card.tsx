"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowUpRight, Bookmark, Star } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ShoppingRecommendation } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { currency } from "@/lib/utils";

interface AIRecommendationCardProps {
  item: ShoppingRecommendation;
  isWishlisted?: boolean;
  onToggleWishlist?: (id: string) => void;
  index?: number;
}

export function AIRecommendationCard({
  item,
  isWishlisted = false,
  onToggleWishlist,
  index = 0,
}: AIRecommendationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
    >
      <div className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card transition-all duration-300 hover:shadow-card-hover">
        {/* Image */}
        <div className="relative overflow-hidden bg-muted">
          <Image
            src={item.image}
            alt={item.title}
            width={600}
            height={500}
            className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          {/* Match score pill */}
          <div className="absolute left-3 top-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-1 text-[10px] font-semibold text-primary-foreground backdrop-blur-md">
              {item.similarity}% match
            </span>
          </div>
          {/* Wishlist button */}
          <button
            type="button"
            onClick={() => onToggleWishlist?.(item.id)}
            className={cn(
              "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full",
              "bg-background/80 backdrop-blur-md border border-border/40",
              "transition-all duration-200 hover:scale-110",
              isWishlisted ? "text-brand" : "text-muted-foreground",
            )}
            aria-label="Toggle wishlist"
          >
            <Bookmark className={cn("h-3.5 w-3.5", isWishlisted && "fill-current")} />
          </button>
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="muted" size="sm">{item.store}</Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-brand text-brand" />
              {item.rating}
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold leading-snug">{item.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{item.brand}</p>

          <div className="mt-auto flex items-center justify-between pt-4">
            <span className="text-display-sm">{currency(item.price)}</span>
            <Button size="sm" asChild>
              <a href={item.url} target="_blank" rel="noreferrer">
                Buy
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
