"use client";

import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Download, Heart, RefreshCcw, Share2, Sparkles, Star,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterChips } from "@/components/ui/filter-chips";
import { wardrobeItems, styleAroundLooks, outfitSuggestions } from "@/lib/mock-data";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

const AESTHETICS = ["Casual", "Elegant", "Office", "Party", "Travel", "Streetwear", "Romantic"];

export default function StyleItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const item = wardrobeItems.find((i) => i.id === id) ?? wardrobeItems[0];
  const { savedOutfitIds, toggleSavedOutfit } = useAppStore();

  const [selectedAesthetics, setAesthetics] = useState<string[]>(["Casual", "Elegant"]);
  const [generated, setGenerated]           = useState(true);
  const [loading, setLoading]               = useState(false);
  const [activeTab, setActiveTab]           = useState<string>("Casual");

  function regenerate() {
    setLoading(true);
    setTimeout(() => setLoading(false), 1200);
  }

  const activeLook = styleAroundLooks.find((l) => l.aesthetic === activeTab) ?? styleAroundLooks[0];

  return (
    <DashboardShell
      heading="Style This Item"
      subheading="One piece, styled multiple ways using only what you own."
    >
      <Button variant="ghost" size="sm" className="w-fit gap-2" asChild>
        <Link href="/wardrobe"><ArrowLeft className="h-4 w-4" /> Back to wardrobe</Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* ── Selected item ── */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
            <div className="relative aspect-[3/4] overflow-hidden bg-muted">
              <Image src={item.image} alt={item.name} fill className="object-cover" priority />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <p className="text-sm font-semibold text-white">{item.name}</p>
                <p className="text-xs text-white/70">{item.brand} · {item.color}</p>
              </div>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-1.5">
                {[item.category, item.style, item.season].map((t) => (
                  <Badge key={t} variant="muted" size="sm">{t}</Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Aesthetic selector */}
          <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card space-y-3">
            <p className="text-label-sm">Style aesthetics</p>
            <FilterChips
              options={AESTHETICS}
              selected={selectedAesthetics}
              onChange={setAesthetics}
            />
            <Button className="w-full gap-2 mt-2" onClick={regenerate} loading={loading}>
              <Sparkles className="h-4 w-4" />
              {loading ? "Styling…" : "Regenerate looks"}
            </Button>
          </div>
        </div>

        {/* ── Generated looks ── */}
        <div className="space-y-5">
          {/* Aesthetic tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {styleAroundLooks.map((look) => (
              <button
                key={look.aesthetic}
                type="button"
                onClick={() => setActiveTab(look.aesthetic)}
                className={cn(
                  "flex-none rounded-xl px-4 py-2 text-sm font-medium transition-all",
                  activeTab === look.aesthetic
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                {look.aesthetic}
              </button>
            ))}
          </div>

          {/* Active look */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="rounded-3xl border border-border/60 bg-card p-6 shadow-card"
            >
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <Badge variant="accent" className="mb-2">{activeLook.aesthetic}</Badge>
                  <p className="text-display-md">Complete {activeLook.aesthetic} Look</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{activeLook.why}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  {[1,2,3,4,5].map((n) => (
                    <Star key={n} className={cn("h-4 w-4", n <= 4 ? "fill-brand text-brand" : "text-muted")} />
                  ))}
                </div>
              </div>

              {/* Outfit items */}
              <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#faf5ef] to-[#e8d5bc] p-5 dark:from-[#1a1410] dark:to-[#2e1f16] mb-5">
                <div className="space-y-2.5">
                  {activeLook.items.map((itemName, i) => (
                    <motion.div
                      key={itemName}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl bg-background/70 px-4 py-3 backdrop-blur-sm",
                        itemName === item.name && "border border-brand/40 bg-brand/5",
                      )}
                    >
                      <div className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        itemName === item.name ? "bg-brand" : "bg-muted-foreground/40",
                      )} />
                      <span className="text-sm font-medium">{itemName}</span>
                      {itemName === item.name && (
                        <Badge variant="accent" size="sm" className="ml-auto">Anchor piece</Badge>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Styling explanation */}
              <div className="rounded-2xl bg-muted/50 p-4 mb-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Styling rationale</p>
                <p className="text-sm leading-6">{activeLook.why}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  className="gap-2"
                  variant={savedOutfitIds.includes(`style-${activeTab}`) ? "accent" : "default"}
                  onClick={() => toggleSavedOutfit(`style-${activeTab}`)}
                >
                  <Heart className={cn("h-4 w-4", savedOutfitIds.includes(`style-${activeTab}`) && "fill-current")} />
                  Save look
                </Button>
                <Button variant="outline" className="gap-2" onClick={regenerate}>
                  <RefreshCcw className="h-4 w-4" /> Regenerate
                </Button>
                <Button variant="outline" size="icon"><Share2 className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon"><Download className="h-4 w-4" /></Button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* All looks grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {styleAroundLooks.filter((l) => l.aesthetic !== activeTab).map((look, i) => (
              <motion.button
                key={look.aesthetic}
                type="button"
                onClick={() => setActiveTab(look.aesthetic)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-border/60 bg-card p-4 text-left hover:shadow-card-hover hover:-translate-y-0.5 transition-all shadow-card"
              >
                <Badge variant="muted" size="sm" className="mb-2">{look.aesthetic}</Badge>
                <div className="space-y-1 mb-2">
                  {look.items.slice(0, 2).map((it) => (
                    <p key={it} className="text-xs text-muted-foreground truncate">{it}</p>
                  ))}
                  {look.items.length > 2 && (
                    <p className="text-xs text-muted-foreground">+{look.items.length - 2} more</p>
                  )}
                </div>
                <p className="text-xs text-brand-dark font-medium">View look →</p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
