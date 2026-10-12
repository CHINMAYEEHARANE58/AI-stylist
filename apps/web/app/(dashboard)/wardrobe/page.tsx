"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Grid3x3, LayoutList, Plus, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClothingCard } from "@/components/ui/clothing-card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips } from "@/components/ui/filter-chips";
import { SearchBar } from "@/components/ui/search-bar";
import { useToast } from "@/components/ui/toast";
import { ApiError, wardrobeApi, type ClothingItemApi } from "@/lib/api-client";

const CATEGORIES = ["Tops", "Shirts", "Blazers", "Jeans", "Trousers", "Skirts", "Dresses", "Shoes", "Sneakers", "Accessories", "Outerwear"];
const SEASONS = ["All season", "Spring", "Summer", "Autumn", "Winter"];
const OCCASIONS = ["Office", "Casual", "Party", "Brunch", "Travel", "Date night", "Vacation"];
const PAGE_SIZE = 24;

function toCardItem(item: ClothingItemApi) {
  return { id: item.id, name: item.name, category: item.category as never, image: item.imageUrl, color: item.colors[0] ?? "", brand: item.brand ?? "", style: item.aesthetics[0] ?? "", season: item.seasons[0] ?? "", occasion: item.occasions[0] ?? "", pattern: item.pattern ?? "", fabric: item.material ?? "", favorite: item.favorite, tags: item.aesthetics, addedAt: item.createdAt };
}
const errorMessage = (error: unknown) => error instanceof ApiError ? error.message : "Please try again.";

export default function WardrobePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [occasions, setOccasions] = useState<string[]>([]);
  const [aesthetics, setAesthetics] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<"masonry" | "grid">("masonry");
  const [page, setPage] = useState(1);

  const filters = { search: debouncedSearch || undefined, category: categories, subcategory: subcategories, color: colors, season: seasons, occasion: occasions, aesthetic: aesthetics, page, perPage: PAGE_SIZE, sortBy: "createdAt" as const, sortDir: "desc" as const };
  const wardrobeQuery = useQuery({ queryKey: ["wardrobe", filters], queryFn: () => wardrobeApi.list(filters), staleTime: 30_000 });
  const summaryQuery = useQuery({ queryKey: ["wardrobe-summary"], queryFn: wardrobeApi.summary, staleTime: 30_000 });
  const favoriteMutation = useMutation({ mutationFn: wardrobeApi.toggleFavorite, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wardrobe"] }), onError: (error) => toast(errorMessage(error), "error") });

  const items = wardrobeQuery.data?.data ?? [];
  const meta = wardrobeQuery.data?.meta;
  const summary = summaryQuery.data?.data;
  const filterCount = categories.length + subcategories.length + colors.length + seasons.length + occasions.length + aesthetics.length;
  const options = (values?: Array<{ label: string }>) => values?.map((value) => value.label) ?? [];
  const resetPage = () => setPage(1);
  const onSearch = (value: string) => {
    setSearch(value);
    window.clearTimeout((window as Window & { wardrobeSearchTimer?: number }).wardrobeSearchTimer);
    (window as Window & { wardrobeSearchTimer?: number }).wardrobeSearchTimer = window.setTimeout(() => { setDebouncedSearch(value); setPage(1); }, 300);
  };
  const clearFilters = () => { setSearch(""); setDebouncedSearch(""); setCategories([]); setSubcategories([]); setColors([]); setSeasons([]); setOccasions([]); setAesthetics([]); setPage(1); };

  return <DashboardShell heading="My Wardrobe" subheading="Your entire closet, digitised and ready to style.">
    <div className="flex flex-wrap items-center gap-3"><SearchBar containerClassName="flex-1 min-w-[200px]" placeholder="Search by name, description, colour, or brand…" value={search} onChange={(event) => onSearch(event.target.value)} onClear={() => onSearch("")} /><Button variant={showFilters ? "default" : "outline"} onClick={() => setShowFilters((current) => !current)} className="gap-2"><SlidersHorizontal className="h-4 w-4" />Filters{filterCount > 0 && <Badge variant="accent" size="sm">{filterCount}</Badge>}</Button><div className="flex rounded-xl border border-border overflow-hidden"><button type="button" onClick={() => setView("masonry")} className={`flex h-10 w-10 items-center justify-center transition-colors ${view === "masonry" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`} aria-label="Masonry view"><Grid3x3 className="h-4 w-4" /></button><button type="button" onClick={() => setView("grid")} className={`flex h-10 w-10 items-center justify-center transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`} aria-label="Grid view"><LayoutList className="h-4 w-4" /></button></div><Button asChild><Link href="/wardrobe/upload"><Plus className="h-4 w-4" />Add item</Link></Button></div>
    <AnimatePresence>{showFilters && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden"><div className="rounded-3xl border border-border/60 bg-card p-5 space-y-4 shadow-card"><div className="flex items-center justify-between"><p className="text-sm font-medium">Filter by</p>{filterCount > 0 && <button type="button" onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X className="h-3 w-3" />Clear all</button>}</div><div><p className="text-label-xs mb-2">Category</p><FilterChips options={CATEGORIES} selected={categories} onChange={(values) => { setCategories(values); resetPage(); }} /></div>{options(summary?.subcategories).length > 0 && <div><p className="text-label-xs mb-2">Subcategory</p><FilterChips options={options(summary?.subcategories)} selected={subcategories} onChange={(values) => { setSubcategories(values); resetPage(); }} /></div>}<div><p className="text-label-xs mb-2">Season</p><FilterChips options={SEASONS} selected={seasons} onChange={(values) => { setSeasons(values); resetPage(); }} /></div><div><p className="text-label-xs mb-2">Occasion</p><FilterChips options={OCCASIONS} selected={occasions} onChange={(values) => { setOccasions(values); resetPage(); }} /></div>{options(summary?.colors).length > 0 && <div><p className="text-label-xs mb-2">Colour</p><FilterChips options={options(summary?.colors)} selected={colors} onChange={(values) => { setColors(values); resetPage(); }} /></div>}{options(summary?.aesthetics).length > 0 && <div><p className="text-label-xs mb-2">Style</p><FilterChips options={options(summary?.aesthetics)} selected={aesthetics} onChange={(values) => { setAesthetics(values); resetPage(); }} /></div>}</div></motion.div>}</AnimatePresence>
    <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{wardrobeQuery.isLoading ? "Loading…" : `${meta?.total ?? 0} ${(meta?.total ?? 0) === 1 ? "item" : "items"}`}</p>{items.length > 0 && <Button variant="ghost" size="sm" asChild><Link href="/outfits"><Sparkles className="h-3.5 w-3.5" />Generate outfit</Link></Button>}</div>
    {wardrobeQuery.isLoading && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="aspect-[3/4] animate-pulse rounded-3xl bg-muted" />)}</div>}
    {wardrobeQuery.isError && <EmptyState icon={<Sparkles className="h-6 w-6" />} title="Could not load wardrobe" description={errorMessage(wardrobeQuery.error)} action={{ label: "Try again", onClick: () => wardrobeQuery.refetch() }} />}
    {!wardrobeQuery.isLoading && !wardrobeQuery.isError && (items.length === 0 ? <EmptyState icon={<Sparkles className="h-6 w-6" />} title={search || filterCount ? "No items found" : "Your wardrobe is empty"} description={search || filterCount ? "Try adjusting your filters or search query." : "Add your first item to get started."} action={search || filterCount ? { label: "Clear filters", onClick: clearFilters } : undefined} /> : <><div className={view === "masonry" ? "masonry-grid" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}>{items.map((item, index) => <ClothingCard key={item.id} item={toCardItem(item)} isFavorite={item.favorite} onToggleFavorite={() => favoriteMutation.mutate(item.id)} href={`/wardrobe/${item.id}`} index={index} />)}</div>{meta && meta.totalPages > 1 && <div className="flex justify-center gap-3 pt-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button><p className="self-center text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</p><Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button></div>}</>)}</DashboardShell>;
}
