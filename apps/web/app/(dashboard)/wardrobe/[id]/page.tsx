"use client";

import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, Pencil, Share2, Shirt, Sparkles, Tag, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { wardrobeItems, styleAroundLooks } from "@/lib/mock-data";
import { useAppStore } from "@/store/app-store";

export default function ClothingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const item = wardrobeItems.find((i) => i.id === id) ?? wardrobeItems[0];
  const { favoriteIds, toggleFavorite } = useAppStore();
  const isFav = favoriteIds.includes(item.id);

  const meta = [
    { label: "Brand",    value: item.brand },
    { label: "Colour",   value: item.color },
    { label: "Fabric",   value: item.fabric },
    { label: "Pattern",  value: item.pattern },
    { label: "Season",   value: item.season },
    { label: "Occasion", value: item.occasion },
    { label: "Style",    value: item.style },
    { label: "Category", value: item.category },
  ];

  return (
    <DashboardShell heading={item.name} subheading={`${item.brand} · ${item.color}`}>
      <Button variant="ghost" size="sm" className="w-fit gap-2" asChild>
        <Link href="/wardrobe"><ArrowLeft className="h-4 w-4" /> Back to wardrobe</Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
        {/* Image */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <div className="overflow-hidden rounded-3xl border border-border/60 bg-muted">
            <Image
              src={item.image}
              alt={item.name}
              width={840}
              height={1050}
              className="w-full object-cover"
              priority
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              variant={isFav ? "accent" : "outline"}
              className="flex-1 gap-2"
              onClick={() => toggleFavorite(item.id)}
            >
              <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
              {isFav ? "Favourited" : "Add to favourites"}
            </Button>
            <Button variant="outline" size="icon"><Share2 className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon"><Pencil className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* Details */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-6"
        >
          {/* Meta grid */}
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-5">
              <Tag className="h-4 w-4 text-brand" />
              <p className="text-sm font-medium">Item details</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {meta.map(({ label, value }) => (
                <div key={label} className="rounded-2xl bg-muted/60 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
                  <p className="text-sm font-medium capitalize">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI styling suggestions */}
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="h-4 w-4 text-brand" />
              <p className="text-sm font-medium">Style this item</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {styleAroundLooks.map((look) => (
                <div key={look.aesthetic} className="rounded-2xl bg-muted/60 p-4">
                  <Badge variant="accent" size="sm" className="mb-3">{look.aesthetic}</Badge>
                  <div className="space-y-1.5 mb-3">
                    {look.items.map((i) => (
                      <div key={i} className="rounded-xl bg-background/70 px-3 py-2 text-xs font-medium">{i}</div>
                    ))}
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">{look.why}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button className="gap-2 flex-1" asChild>
              <Link href={`/style-item/${item.id}`}>
                <Sparkles className="h-4 w-4" /> Full style studio
              </Link>
            </Button>
            <Button variant="outline" className="gap-2 flex-1" asChild>
              <Link href="/outfits">
                <Shirt className="h-4 w-4" /> Generate outfit
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </DashboardShell>
  );
}
