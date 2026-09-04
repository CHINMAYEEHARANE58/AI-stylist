"use client";

import Image from "next/image";
import { Heart, MoreHorizontal, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

import { wardrobeItems } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function WardrobeGrid() {
  const favoriteIds = useAppStore((state) => state.favoriteIds);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);

  return (
    <div className="space-y-6">
      <Card className="rounded-[30px] p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-11" placeholder="Search by color, category, fabric, or vibe" />
          </div>
          <Input placeholder="Occasion: office, brunch, party" />
          <Button variant="outline">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </Button>
          <Button>
            <Sparkles className="h-4 w-4" />
            Scan wardrobe
          </Button>
        </div>
      </Card>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {wardrobeItems.map((item, index) => {
          const isFavorite = favoriteIds.includes(item.id);

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: index * 0.06 }}
            >
              <Card className="group overflow-hidden rounded-[30px] p-0">
                <div className="relative overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={600}
                    height={700}
                    className="h-[320px] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                    <Badge>{item.category}</Badge>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleFavorite(item.id)}
                        className={cn(
                          "rounded-full border border-border/70 bg-background/80 p-2 backdrop-blur-xl transition",
                          isFavorite && "text-red-500",
                        )}
                        aria-label="Toggle favorite"
                      >
                        <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
                      </button>
                      <button type="button" className="rounded-full border border-border/70 bg-background/80 p-2 backdrop-blur-xl">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-3xl leading-none">{item.name}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {item.brand} • {item.color}
                      </p>
                    </div>
                    <Badge>{item.style}</Badge>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {[item.season, item.occasion, item.pattern, item.fabric].map((label) => (
                      <span key={label} className="rounded-full bg-muted px-3 py-1.5">
                        {label}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 flex gap-3">
                    <Button className="flex-1">Style this item</Button>
                    <Button className="flex-1" variant="outline">
                      Edit
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

