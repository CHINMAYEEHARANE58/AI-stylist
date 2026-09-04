"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Grid3x3, LayoutList, Plus, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { FilterChips } from "@/components/ui/filter-chips";
import { ClothingCard } from "@/components/ui/clothing-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { wardrobeItems } from "@/lib/mock-data";
import { useAppStore } from "@/store/app-store";

const CATEGORIES = ["All", "Tops", "Shirts", "Blazers", "Jeans", "Trousers", "Skirts", "Dresses", "Shoes", "Accessories", "Outerwear"];
const SEASONS    = ["All season", "Spring", "Summer", "Autumn", "Winter"];
const OCCASIONS  = ["Office", "Casual", "Party", "Brunch", "Travel", "Date night", "Vacation"];
const STYLES     = ["Minimal", "Classic", "Elegant", "Casual", "Streetwear", "Quiet luxury"];

export default function WardrobePage() {
  const { favoriteIds, toggleFavorite } = useAppStore();
  const [search, setSearch]           = useState("");
  const [activeCategories, setCategories] = useState<string[]>([]);
  const [activeSeasons, setSeasons]    = useState<string[]>([]);
  const [activeOccasions, setOccasions] = useState<string[]>([]);
  const [showFilters, setShowFilters]  = useState(false);
  const [view, setView]               = useState<"masonry" | "grid">("masonry");

  const filtered = useMemo(() => {
    return wardrobeItems.filter((item) => {
      const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.color.toLowerCase().includes(search.toLowerCase()) ||
        item.brand.toLowerCase().includes(search.toLowerCase());
      const matchCat = !activeCategories.length || activeCategories.map((c) => c.toLowerCase()).includes(item.category.toLowerCase());
      const matchSeason = !activeSeasons.length || activeSeasons.includes(item.season);
      const matchOccasion = !activeOccasions.length || activeOccasions.some((o) => item.occasion.toLowerCase().includes(o.toLowerCase()));
      return matchSearch && matchCat && matchSeason && matchOccasion;
    });
  }, [search, activeCategories, activeSeasons, activeOccasions]);

  const activeFilterCount = activeCategories.length + activeSeasons.length + activeOccasions.length;

  function clearAllFilters() {
    setCategories([]);
    setSeasons([]);
    setOccasions([]);
    setSearch("");
  }

  return (
    <DashboardShell
      heading="My Wardrobe"
      subheading="Your entire closet, digitised and ready to style."
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar
          containerClassName="flex-1 min-w-[200px]"
          placeholder="Search by name, colour, brand…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
        />
        <Button
          variant={showFilters ? "default" : "outline"}
          onClick={() => setShowFilters((v) => !v)}
          className="gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="accent" size="sm">{activeFilterCount}</Badge>
          )}
        </Button>
        <div className="flex rounded-xl border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setView("masonry")}
            className={`flex h-10 w-10 items-center justify-center transition-colors ${view === "masonry" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="Masonry view"
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("grid")}
            className={`flex h-10 w-10 items-center justify-center transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="Grid view"
          >
            <LayoutList className="h-4 w-4" />
          </button>
        </div>
        <Button asChild>
          <Link href="/wardrobe/upload">
            <Plus className="h-4 w-4" />
            Add item
          </Link>
        </Button>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="rounded-3xl border border-border/60 bg-card p-5 space-y-4 shadow-card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Filter by</p>
                {activeFilterCount > 0 && (
                  <button type="button" onClick={clearAllFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-3 w-3" /> Clear all
                  </button>
                )}
              </div>
              <div>
                <p className="text-label-xs mb-2">Category</p>
                <FilterChips options={CATEGORIES.slice(1)} selected={activeCategories} onChange={setCategories} />
              </div>
              <div>
                <p className="text-label-xs mb-2">Season</p>
                <FilterChips options={SEASONS} selected={activeSeasons} onChange={setSeasons} />
              </div>
              <div>
                <p className="text-label-xs mb-2">Occasion</p>
                <FilterChips options={OCCASIONS} selected={activeOccasions} onChange={setOccasions} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "item" : "items"}
        </p>
        {filtered.length > 0 && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/outfits">
              <Sparkles className="h-3.5 w-3.5" />
              Generate outfit
            </Link>
          </Button>
        )}
      </div>

      {/* Items */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="No items found"
          description="Try adjusting your filters or search query."
          action={{ label: "Clear filters", onClick: clearAllFilters }}
        />
      ) : (
        <div className={view === "masonry" ? "masonry-grid" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
          {filtered.map((item, i) => (
            <ClothingCard
              key={item.id}
              item={item}
              isFavorite={favoriteIds.includes(item.id)}
              onToggleFavorite={toggleFavorite}
              href={`/wardrobe/${item.id}`}
              index={i}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
