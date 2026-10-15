"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
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
  detailsHref?: string;
}

export function AIRecommendationCard({
  item,
  isWishlisted = false,
  onToggleWishlist,
  index = 0,
  detailsHref,
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
          {item.isSample ? <div className="absolute left-3 top-3"><Badge variant="warning" size="sm">Sample catalog</Badge></div>
            : item.similarity !== null && <div className="absolute left-3 top-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-1 text-[10px] font-semibold text-primary-foreground backdrop-blur-md">
                {item.similarity}% relevance
              </span>
            </div>}
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
            <Badge variant={item.available === false ? "warning" : "muted"} size="sm">
              {item.available === false ? "Unavailable" : item.store ?? "No live offer"}
            </Badge>
            {item.rating != null && <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-brand text-brand" />{item.rating}
            </div>}
          </div>
          <p className="mt-3 text-sm font-semibold leading-snug">{item.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{item.brand}</p>
          {detailsHref && <Link href={detailsHref} className="mt-1 w-fit text-xs font-medium text-brand-dark hover:underline">
            View product details
          </Link>}
          {item.reason && <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.reason}</p>}

          <div className="mt-auto flex items-center justify-between pt-4">
            <span className="text-display-sm">{item.price == null ? "Price unavailable" : currency(item.price, item.currency ?? "INR")}</span>
            {item.url && item.available !== false && !item.isSample && <Button size="sm" asChild>
              <a href={item.url} target="_blank" rel="noopener noreferrer">Buy <ArrowUpRight className="h-3.5 w-3.5" /></a>
            </Button>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
