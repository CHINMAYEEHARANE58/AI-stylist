"use client";

import { CalendarDays, CloudSun, Download, Heart, ImageDown, RefreshCcw, Share2, Sparkles, Star } from "lucide-react";

import { eventOccasions, occasions, outfitSuggestions } from "@/lib/mock-data";
import { useAppStore } from "@/store/app-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function OutfitGeneratorPanel() {
  const savedOutfitIds = useAppStore((state) => state.savedOutfitIds);
  const toggleSavedOutfit = useAppStore((state) => state.toggleSavedOutfit);

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="rounded-[32px]">
        <p className="text-sm uppercase tracking-[0.26em] text-muted-foreground">AI generator</p>
        <h2 className="mt-3 font-display text-4xl">Dress for the exact moment.</h2>
        <div className="mt-6 grid gap-3">
          <Input placeholder="Occasion: brunch, office, wedding" />
          <Input placeholder="Weather: 24°C sunny, monsoon evening" />
          <Input placeholder="Anchor item: black skirt, white shirt" />
          <Textarea placeholder="Optional notes: elegant, minimal, comfortable for walking..." />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {occasions.map((occasion) => (
            <Badge key={occasion}>{occasion}</Badge>
          ))}
        </div>
        <div className="mt-5 rounded-[24px] bg-muted/70 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4" />
            Event-based styling
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {eventOccasions.map((event) => (
              <Button key={event} variant="outline" size="sm">
                {event}
              </Button>
            ))}
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button className="flex-1">
            <Sparkles className="h-4 w-4" />
            Generate outfit
          </Button>
          <Button variant="outline" className="flex-1">
            <CloudSun className="h-4 w-4" />
            Use live weather
          </Button>
        </div>

        <div className="mt-8 rounded-[28px] bg-muted/70 p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CloudSun className="h-4 w-4" />
            Weather styling context
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            29°C, humid, light rain later. Prioritize breathable layers, closed footwear, and a jacket that can handle drizzle.
          </p>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {outfitSuggestions.map((outfit) => {
          const isSaved = savedOutfitIds.includes(outfit.id);

          return (
            <Card key={outfit.id} className="rounded-[32px]">
              <div className="flex items-center justify-between">
                <Badge>{outfit.weather}</Badge>
                <span className="text-sm text-muted-foreground">{outfit.score}% confidence</span>
              </div>
              <h3 className="mt-5 font-display text-4xl">{outfit.title}</h3>
              <p className="mt-2 text-sm uppercase tracking-[0.22em] text-muted-foreground">
                {outfit.occasion} • {outfit.mood}
              </p>

              <div className="mt-6 grid gap-3 rounded-[28px] bg-gradient-to-br from-[#f4ede6] via-[#eee0d4] to-[#d2baa2] p-5 dark:from-[#211915] dark:via-[#2a211c] dark:to-[#44342a]">
                {outfit.items.map((item) => (
                  <div key={item} className="rounded-2xl bg-background/80 px-4 py-3 text-sm backdrop-blur-xl">
                    {item}
                  </div>
                ))}
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 px-4 py-3 text-sm">
                  Accessory accent: {outfit.accent}
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-muted-foreground">{outfit.notes}</p>
              <div className="mt-5 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button key={rating} type="button" aria-label={`Rate outfit ${rating} star`}>
                    <Star className={`h-5 w-5 ${rating <= 4 ? "fill-current text-[#9b7653]" : "text-muted-foreground"}`} />
                  </button>
                ))}
                <span className="ml-2 text-sm text-muted-foreground">Rating improves future recommendations</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => toggleSavedOutfit(outfit.id)} className="flex-1 sm:flex-none">
                  <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                  {isSaved ? "Saved" : "Save outfit"}
                </Button>
                <Button variant="outline">
                  <RefreshCcw className="h-4 w-4" />
                  Regenerate
                </Button>
                <Button variant="outline">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button variant="outline">
                  <ImageDown className="h-4 w-4" />
                  Save image
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <Button variant="outline">Add notes</Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
