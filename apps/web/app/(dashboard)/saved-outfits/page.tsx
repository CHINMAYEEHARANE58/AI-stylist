"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OutfitCard } from "@/components/ui/outfit-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { outfitSuggestions } from "@/lib/mock-data";
import { useAppStore } from "@/store/app-store";

export default function SavedOutfitsPage() {
  const { savedOutfitIds, toggleSavedOutfit } = useAppStore();
  const saved = outfitSuggestions.filter((o) => savedOutfitIds.includes(o.id));

  return (
    <DashboardShell
      heading="Saved Outfits"
      subheading="Your favourite AI-generated looks, ready to wear again."
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {saved.length} saved {saved.length === 1 ? "outfit" : "outfits"}
          </p>
          {saved.length > 0 && <Badge variant="accent"><Heart className="h-3 w-3" /> Collection</Badge>}
        </div>
        <Button size="sm" asChild>
          <Link href="/outfits">
            <Sparkles className="h-3.5 w-3.5" /> Generate more
          </Link>
        </Button>
      </div>

      {saved.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-6 w-6" />}
          title="No saved outfits yet"
          description="Generate outfits and save the ones you love. They'll appear here."
          action={{ label: "Generate outfits", onClick: () => {} }}
        />
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
          className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
        >
          {saved.map((outfit, i) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              isSaved
              onToggleSave={toggleSavedOutfit}
              index={i}
            />
          ))}
        </motion.div>
      )}

      {/* Lookbooks section */}
      {saved.length > 0 && (
        <div className="mt-4">
          <p className="text-label-sm mb-4">Lookbooks</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Weekend Neutrals",   "Brunch, errands, and coffee meetings."],
              ["Office Minimal",     "Clean tailoring and polished neutrals."],
              ["Date Night Moods",   "Elegant high-contrast looks with statement accents."],
            ].map(([title, desc]) => (
              <div
                key={title as string}
                className="group rounded-3xl border border-border/60 bg-card p-5 shadow-card cursor-pointer hover:shadow-card-hover transition-all hover:-translate-y-0.5"
              >
                <div className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#faf5ef] to-[#e8d5bc] dark:from-[#1a1410] dark:to-[#2e1f16] p-4">
                  <div className="grid grid-cols-2 gap-2">
                    {[0,1,2,3].map((n) => (
                      <div key={n} className="h-16 rounded-xl bg-background/50" />
                    ))}
                  </div>
                </div>
                <p className="font-semibold text-sm">{title}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
