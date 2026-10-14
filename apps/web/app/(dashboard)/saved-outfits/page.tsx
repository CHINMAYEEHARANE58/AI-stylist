"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { OutfitCard } from "@/components/ui/outfit-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterChips } from "@/components/ui/filter-chips";
import { SearchBar } from "@/components/ui/search-bar";
import { outfitsApi } from "@/lib/api-client";
import type { OutfitSuggestion } from "@/lib/types";

const OCCASIONS = ["Office", "Casual", "Party", "Brunch", "Travel", "Date night", "Vacation"];
const PAGE_SIZE = 12;

export default function SavedOutfitsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [collection, setCollection] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const sortBy = sort === "title" ? "title" as const : sort === "updated" ? "updatedAt" as const : "savedAt" as const;
  const sortDir = sort === "oldest" || sort === "title" ? "asc" as const : "desc" as const;
  const savedQuery = useQuery({
    queryKey: ["saved-outfits", { page, debouncedSearch, collection, occasion: occasion[0], favoritesOnly, sort }],
    queryFn: () => outfitsApi.getSaved({ page, perPage: PAGE_SIZE, search: debouncedSearch || undefined,
      collection: collection ?? undefined, occasion: occasion[0], favorite: favoritesOnly || undefined, sortBy, sortDir }),
  });
  const collectionsQuery = useQuery({ queryKey: ["outfit-lookbooks"], queryFn: outfitsApi.getCollections });
  const remove = useMutation({
    mutationFn: (id: string) => outfitsApi.deleteSaved(id),
    onSuccess: () => {
      if (saved.length === 1 && page > 1) setPage(page - 1);
      void queryClient.invalidateQueries({ queryKey: ["saved-outfits"] });
      void queryClient.invalidateQueries({ queryKey: ["outfit-lookbooks"] });
    },
  });

  const saved = savedQuery.data?.data ?? [];
  const cards: OutfitSuggestion[] = saved.map(({ id, outfit, notes }) => ({
    id,
    title: outfit.title,
    mood: outfit.aesthetic ?? "Styled look",
    occasion: outfit.occasion ?? "Any occasion",
    weather: outfit.season ?? "All seasons",
    items: outfit.items.map(({ clothingItem, snapshotName }) => clothingItem?.name ?? snapshotName),
    accent: "",
    notes: notes || outfit.explanation || "Saved from your wardrobe.",
  }));
  const hasFilters = Boolean(debouncedSearch || collection || occasion.length || favoritesOnly);

  function clearFilters() {
    setSearch(""); setDebouncedSearch(""); setCollection(null); setOccasion([]); setFavoritesOnly(false); setPage(1);
  }

  function removeSaved(id: string) {
    if (window.confirm("Remove this outfit from your saved looks?")) remove.mutate(id);
  }

  return (
    <DashboardShell heading="Saved Outfits" subheading="Your favourite AI-generated looks, ready to wear again.">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{savedQuery.data?.meta.total ?? 0} saved {(savedQuery.data?.meta.total ?? 0) === 1 ? "outfit" : "outfits"}</p>
          {collection && <Badge variant="accent"><Heart className="h-3 w-3" /> {collection}</Badge>}
        </div>
        <Button size="sm" asChild><Link href="/outfits"><Sparkles className="h-3.5 w-3.5" /> Generate more</Link></Button>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-card space-y-3">
        <div className="flex flex-wrap gap-3">
          <SearchBar value={search} onChange={(event) => setSearch(event.target.value)} onClear={() => setSearch("")}
            placeholder="Search saved outfits and notes…" aria-label="Search saved outfits" containerClassName="min-w-[220px] flex-1" />
          <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} aria-label="Sort saved outfits"
            className="h-11 rounded-2xl border border-border bg-background px-4 text-sm">
            <option value="newest">Newest saved</option><option value="oldest">Oldest saved</option>
            <option value="title">Title A–Z</option><option value="updated">Recently edited</option>
          </select>
          <Button variant={favoritesOnly ? "accent" : "outline"} onClick={() => { setFavoritesOnly(!favoritesOnly); setPage(1); }}>
            <Heart className="h-4 w-4" /> Favorites
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-label-xs">Occasion</span>
          <FilterChips options={OCCASIONS} selected={occasion} multi={false} onChange={(values) => { setOccasion(values); setPage(1); }} />
          {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}
        </div>
      </div>

      {savedQuery.isPending ? (
        <div role="status" className="rounded-3xl border border-border/60 bg-card p-8 text-sm text-muted-foreground">Loading saved outfits…</div>
      ) : savedQuery.error ? (
        <EmptyState icon={<Heart className="h-6 w-6" />} title="Could not load saved outfits" description={savedQuery.error.message}
          action={{ label: "Try again", onClick: () => void savedQuery.refetch() }} />
      ) : saved.length === 0 ? (
        <EmptyState icon={<Heart className="h-6 w-6" />} title={hasFilters ? "No matching outfits" : "No saved outfits yet"}
          description={hasFilters ? "Try another search or clear the filters." : "Generate outfits and save the ones you love. They'll appear here."}
          action={{ label: hasFilters ? "Clear filters" : "Generate outfits", onClick: () => hasFilters ? clearFilters() : router.push("/outfits") }} />
      ) : (
        <>
          {remove.error && <p role="alert" className="text-sm text-destructive">{remove.error.message}</p>}
          <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
            className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((outfit, index) => (
              <OutfitCard key={outfit.id} outfit={outfit} isSaved detailHref={`/saved-outfits/${outfit.id}`}
                onToggleSave={removeSaved}
                onRegenerate={(savedId) => {
                  const anchorId = saved.find((entry) => entry.id === savedId)?.outfit.items.find((item) => item.clothingItem)?.clothingItem?.id;
                  if (anchorId) router.push(`/style-item/${anchorId}`);
                }} index={index} />
            ))}
          </motion.div>
          {(savedQuery.data?.meta.totalPages ?? 0) > 1 && <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {savedQuery.data?.meta.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= (savedQuery.data?.meta.totalPages ?? 1)} onClick={() => setPage(page + 1)}>Next</Button>
          </div>}
        </>
      )}

      <div className="mt-4">
        <p className="text-label-sm mb-4">Lookbooks</p>
        {collectionsQuery.isPending ? <p role="status" className="text-sm text-muted-foreground">Loading lookbooks…</p>
          : collectionsQuery.error ? <div className="flex items-center gap-3 text-sm text-destructive">Could not load lookbooks.
            <Button variant="ghost" size="sm" onClick={() => void collectionsQuery.refetch()}>Retry</Button></div>
          : (collectionsQuery.data?.data.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">Open a saved outfit to add it to your first lookbook.</p>
          : <div className="grid gap-4 sm:grid-cols-3">
            {collectionsQuery.data?.data.map((lookbook) => (
              <button key={lookbook.name} type="button" onClick={() => { setCollection(collection === lookbook.name ? null : lookbook.name); setPage(1); }}
                className={`group rounded-3xl border bg-card p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover ${collection === lookbook.name ? "border-brand" : "border-border/60"}`}>
                <div className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#faf5ef] to-[#e8d5bc] p-4 dark:from-[#1a1410] dark:to-[#2e1f16]">
                  <div className="grid grid-cols-2 gap-2">{[0, 1, 2, 3].map((index) => <div key={index} className="h-16 rounded-xl bg-background/50" />)}</div>
                </div>
                <p className="font-semibold text-sm">{lookbook.name}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-5">{lookbook.count} {lookbook.count === 1 ? "outfit" : "outfits"}</p>
              </button>
            ))}
          </div>}
      </div>
    </DashboardShell>
  );
}
