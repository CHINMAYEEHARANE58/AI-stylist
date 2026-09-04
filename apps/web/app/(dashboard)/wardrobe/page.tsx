"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Grid3x3, LayoutList, Plus, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { FilterChips } from "@/components/ui/filter-chips";
import { ClothingCard } from "@/components/ui/clothing-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { wardrobeApi } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";

const CATEGORIES = ["Tops", "Shirts", "Blazers", "Jeans", "Trousers", "Skirts", "Dresses", "Shoes", "Sneakers", "Accessories", "Outerwear"];
const SEASONS    = ["All season", "Spring", "Summer", "Autumn", "Winter"];
const OCCASIONS  = ["Office", "Casual", "Party", "Brunch", "Travel", "Date night", "Vacation"];

// Adapter: convert API item → ClothingCard-compatible shape
function toCardItem(item: ReturnType<typeof wardrobeApi.list> extends Promise<{ data: Array<infer T> }> ? T : never) {
  return {
    id: item.id,
    name: item.name,
    category: item.category as never,
    image: item.imageUrl,
    color: item.colors[0] ?? "",
    brand: item.brand ?? "",
    style: item.aesthetics[0] ?? "",
    season: item.seasons[0] ?? "",
    occasion: item.occasions[0] ?? "",
    pattern: item.pattern ?? "",
    fabric: item.material ?? "",
    favorite: item.favorite,
    tags: item.aesthetics,
    addedAt: item.createdAt,
  };
}

export default function WardrobePage() {
  const queryClient = useQueryClient();
  const { favoriteIds, toggleFavoriteLocal } = useAppStore();

  const [search, setSearch]               = useState("");
  const [debouncedSearch, setDebounced]   = useState("");
  const [activeCategories, setCategories] = useState<string[]>([]);
  const [activeSeasons, setSeasons]       = useState<string[]>([]);
  const [activeOccasions, setOccasions]   = useState<string[]>([]);
  const [showFilters, setShowFilters]     = useState(false);
  const [view, setView]                   = useState<"masonry" | "grid">("masonry");

  // Debounce search
  const handleSearch = (q: string) => {
    setSearch(q);
    clearTimeout((window as Window & { _wardrobeTimer?: number })._wardrobeTimer);
    (window as Window & { _wardrobeTimer?: number })._wardrobeTimer = window.setTimeout(() => setDebounced(q), 300);
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["wardrobe", { search: debouncedSearch, categories: activeCategories, seasons: activeSeasons, occasions: activeOccasions }],
    queryFn: () => wardrobeApi.list({
      search: debouncedSearch || undefined,
      category: activeCategories[0]?.toLowerCase(),
      season: activeSeasons[0],
      occasion: activeOccasions[0],
      perPage: 100,
    }),
    staleTime: 30_000,
  });

  const favoriteMutation = useMutation({
    mutationFn: (id: string) => wardrobeApi.toggleFavorite(id),
    onMutate: (id) => toggleFavoriteLocal(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wardrobe"] }),
  });

  const items = useMemo(() => {
    const raw = data?.data ?? [];
    // Client-side filter for multi-select until backend supports it
    return raw.filter((item) => {
      const matchCat = !activeCategories.length || activeCategories.map((c) => c.toLowerCase()).includes(item.category.toLowerCase());
      const matchSeason = !activeSeasons.length || item.seasons.some((s) => activeSeasons.includes(s));
      const matchOcc = !activeOccasions.length || item.occasions.some((o) => activeOccasions.some((ao) => o.toLowerCase().includes(ao.toLowerCase())));
      return matchCat && matchSeason && matchOcc;
    });
  }, [data, activeCategories, activeSeasons, activeOccasions]);

  const activeFilterCount = activeCategories.length + activeSeasons.length + activeOccasions.length;

  function clearAllFilters() {
    setCategories([]);
    setSeasons([]);
    setOccasions([]);
    setSearch("");
    setDebounced("");
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
          onChange={(e) => handleSearch(e.target.value)}
          onClear={() => { setSearch(""); setDebounced(""); }}
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
                <FilterChips options={CATEGORIES} selected={activeCategories} onChange={setCategories} />
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
          {isLoading ? "Loading…" : `${items.length} ${items.length === 1 ? "item" : "items"}`}
        </p>
        {items.length > 0 && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/outfits">
              <Sparkles className="h-3.5 w-3.5" />
              Generate outfit
            </Link>
          </Button>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="Could not load wardrobe"
          description="Please check your connection and try again."
        />
      )}

      {/* Items */}
      {!isLoading && !isError && (
        items.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-6 w-6" />}
            title={search || activeFilterCount > 0 ? "No items found" : "Your wardrobe is empty"}
            description={search || activeFilterCount > 0
              ? "Try adjusting your filters or search query."
              : "Add your first item to get started."
            }
            action={
              search || activeFilterCount > 0
                ? { label: "Clear filters", onClick: clearAllFilters }
                : { label: "Add first item", onClick: () => {} }
            }
          />
        ) : (
          <div className={view === "masonry" ? "masonry-grid" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>
            {items.map((item, i) => (
              <ClothingCard
                key={item.id}
                item={toCardItem(item as never)}
                isFavorite={item.favorite || favoriteIds.includes(item.id)}
                onToggleFavorite={(id) => favoriteMutation.mutate(id)}
                href={`/wardrobe/${item.id}`}
                index={i}
              />
            ))}
          </div>
        )
      )}
    </DashboardShell>
  );
}
