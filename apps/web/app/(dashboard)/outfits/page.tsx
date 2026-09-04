"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudSun, RefreshCcw, Sparkles, Wand2, Calendar,
  Wind, Heart, ChevronRight,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FilterChips } from "@/components/ui/filter-chips";
import { OutfitCard } from "@/components/ui/outfit-card";
import { Badge } from "@/components/ui/badge";
import {
  outfitSuggestions, occasions, moods, weatherOptions, wardrobeItems,
} from "@/lib/mock-data";
import { useAppStore } from "@/store/app-store";

export default function OutfitsPage() {
  const { savedOutfitIds, toggleSavedOutfit } = useAppStore();
  const [selectedOccasions, setOccasions] = useState<string[]>([]);
  const [selectedMoods, setMoods]         = useState<string[]>([]);
  const [selectedWeather, setWeather]     = useState<string[]>([]);
  const [anchorItem, setAnchorItem]       = useState("");
  const [notes, setNotes]                 = useState("");
  const [generated, setGenerated]         = useState(false);
  const [loading, setLoading]             = useState(false);

  function generate() {
    setLoading(true);
    setTimeout(() => { setLoading(false); setGenerated(true); }, 1400);
  }

  return (
    <DashboardShell
      heading="AI Outfit Generator"
      subheading="Describe your moment and AI builds the perfect outfit from your wardrobe."
    >
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        {/* ── Controls panel ── */}
        <div className="space-y-5">
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card space-y-5">
            <p className="text-label-sm">Generator settings</p>

            {/* Occasion chips */}
            <div>
              <p className="text-xs font-medium mb-2.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-brand" /> Occasion
              </p>
              <FilterChips options={occasions} selected={selectedOccasions} onChange={setOccasions} />
            </div>

            {/* Mood */}
            <div>
              <p className="text-xs font-medium mb-2.5 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-brand" /> Mood / aesthetic
              </p>
              <FilterChips options={moods} selected={selectedMoods} onChange={setMoods} />
            </div>

            {/* Weather */}
            <div>
              <p className="text-xs font-medium mb-2.5 flex items-center gap-1.5">
                <CloudSun className="h-3.5 w-3.5 text-brand" /> Weather
              </p>
              <FilterChips options={weatherOptions} selected={selectedWeather} onChange={setWeather} multi={false} />
            </div>

            {/* Anchor item */}
            <div>
              <p className="text-xs font-medium mb-2.5 flex items-center gap-1.5">
                <Wand2 className="h-3.5 w-3.5 text-brand" /> Build around (optional)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {wardrobeItems.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAnchorItem(anchorItem === item.name ? "" : item.name)}
                    className={`rounded-xl border px-3 py-1.5 text-xs transition-all ${
                      anchorItem === item.name
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              placeholder="Any extra notes… comfortable for walking, avoid showing arms, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
            />

            <div className="flex gap-3">
              <Button className="flex-1 gap-2" onClick={generate} loading={loading}>
                <Sparkles className="h-4 w-4" />
                {loading ? "Generating…" : "Generate outfits"}
              </Button>
              <Button variant="outline" size="icon" onClick={() => setGenerated(false)} aria-label="Reset">
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Live weather context */}
          <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-[#faf5ef] to-[#e8d5bc] p-5 dark:from-[#1a1410] dark:to-[#2e1f16]">
            <div className="flex items-center gap-2 mb-2">
              <CloudSun className="h-4 w-4 text-brand" />
              <p className="text-xs font-medium">Live weather · Mumbai</p>
            </div>
            <p className="text-display-sm mb-1">29°C, Humid</p>
            <p className="text-xs text-muted-foreground">Light rain later evening · Feels like 32°C</p>
            <div className="mt-3 flex items-center gap-2">
              <Wind className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">AI suggests breathable layers + closed footwear</p>
            </div>
          </div>
        </div>

        {/* ── Generated outfits ── */}
        <div>
          <AnimatePresence mode="wait">
            {!generated ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border bg-muted/30 p-12 text-center"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                  <Sparkles className="h-7 w-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-display-sm mb-2">Your outfits will appear here</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Select an occasion, mood, and weather, then hit Generate.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{outfitSuggestions.length} outfits generated</p>
                    <Badge variant="accent" size="sm">
                      <Sparkles className="h-3 w-3" /> AI powered
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={generate} className="gap-1.5">
                    <RefreshCcw className="h-3.5 w-3.5" /> Regenerate
                  </Button>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {outfitSuggestions.map((outfit, i) => (
                    <OutfitCard
                      key={outfit.id}
                      outfit={outfit}
                      isSaved={savedOutfitIds.includes(outfit.id)}
                      onToggleSave={toggleSavedOutfit}
                      index={i}
                    />
                  ))}
                </div>
                <div className="flex justify-center pt-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/saved-outfits">
                      <Heart className="h-3.5 w-3.5" /> View saved outfits
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardShell>
  );
}
