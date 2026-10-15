"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, RefreshCcw, ShoppingBag, Sparkles, TrendingUp } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AIRecommendationCard } from "@/components/ui/ai-recommendation-card";
import { FilterChips } from "@/components/ui/filter-chips";
import { SearchBar } from "@/components/ui/search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { shoppingApi, type ShoppingItemApi } from "@/lib/api-client";
import type { ShoppingRecommendation } from "@/lib/types";
import { currency } from "@/lib/utils";

const CATEGORIES = ["Tops", "Bottoms", "Dresses", "Shoes", "Accessories", "Outerwear"];

function cardItem(item: ShoppingItemApi): ShoppingRecommendation {
  return { id: item.id, title: item.title, brand: item.brand, category: item.category ?? undefined,
    price: item.price, originalPrice: item.originalPrice, currency: item.currency,
    store: item.store, similarity: item.relevance, image: item.imageUrl ?? "/shopping-1.svg",
    url: item.url, reason: item.reason, isSample: item.isSample, available: item.available };
}

export default function ShoppingPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeCats, setCats] = useState<string[]>([]);
  const [activeStores, setStores] = useState<string[]>([]);
  const [sort, setSort] = useState<"relevance" | "newest">("relevance");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState("");
  const params = { search: search || undefined, category: activeCats.join(",") || undefined,
    store: activeStores.join(",") || undefined, sort, page, perPage: 12 };
  const recommendations = useQuery({ queryKey: ["shopping", params], queryFn: () => shoppingApi.list(params) });
  const wishlist = useQuery({ queryKey: ["shopping-wishlist"], queryFn: shoppingApi.getWishlist });
  const refresh = useMutation({ mutationFn: shoppingApi.refresh, onSuccess: async () => {
    setActionError(""); await queryClient.invalidateQueries({ queryKey: ["shopping"] });
  }, onError: (error: Error) => setActionError(error.message) });
  const toggleWishlist = useMutation({ mutationFn: async (target: { item: ShoppingItemApi; wishlistItemId?: string }) => {
    if (target.wishlistItemId) await shoppingApi.removeWishlistItem(target.wishlistItemId);
    else if (target.item.wishlisted) await shoppingApi.removeFromWishlist(target.item.id);
    else await shoppingApi.addToWishlist(target.item.id);
  }, onSuccess: async () => {
    setActionError("");
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["shopping"] }),
      queryClient.invalidateQueries({ queryKey: ["shopping-wishlist"] })]);
  }, onError: (error: Error) => setActionError(error.message) });

  const items = recommendations.data?.data ?? [];
  const saved = wishlist.data?.data ?? [];
  const storeOptions = Array.from(new Set([...activeStores, ...items, ...saved.map((row) => row.item)]
    .flatMap((item) => typeof item === "string" ? [item] : item.offers.filter((offer) => offer.freshness === "fresh").map((offer) => offer.store))));
  const bestComparison = items.find((item) => item.offers.length > 0);
  const comparisonRows = bestComparison?.offers ?? [];
  const reasoning = items.filter((item) => item.reason).slice(0, 3);
  const gaps = items.filter((item) => item.signals?.includes("wardrobe-gap") ||
    item.signals?.includes("inspiration")).slice(0, 3);
  const styleMatches = items.filter((item) => item.signals?.includes("style") ||
    item.signals?.includes("color")).slice(0, 3);
  const totalPages = recommendations.data?.meta.totalPages ?? 0;

  return <DashboardShell heading="AI Shopping Assistant"
    subheading="Targeted recommendations based on your wardrobe gaps, saved inspirations, and style preferences.">
    <div className="flex flex-wrap items-center gap-3">
      <SearchBar containerClassName="flex-1 min-w-[200px]" placeholder="Search recommendations…"
        value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }}
        onClear={() => { setSearch(""); setPage(1); }} />
      <select aria-label="Sort recommendations" value={sort} onChange={(event) => {
        setSort(event.target.value as "relevance" | "newest"); setPage(1);
      }} className="h-10 rounded-xl border border-border bg-card px-3 text-sm">
        <option value="relevance">Most relevant</option><option value="newest">Newest</option>
      </select>
      <Button variant="outline" className="gap-2" disabled={refresh.isPending}
        onClick={() => refresh.mutate()}><RefreshCcw className="h-4 w-4" />
        {refresh.isPending ? "Refreshing…" : "Refresh picks"}</Button>
    </div>
    <FilterChips options={CATEGORIES} selected={activeCats} onChange={(values) => { setCats(values); setPage(1); }} />
    {storeOptions.length > 0 && <FilterChips options={storeOptions} selected={activeStores}
      onChange={(values) => { setStores(values); setPage(1); }} />}
    {actionError && <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {actionError} <Button variant="ghost" size="sm" onClick={() => setActionError("")}>Dismiss</Button></div>}

    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-label-sm">{recommendations.data?.meta.total ?? 0} recommendations</p>
        <Badge variant="accent"><Sparkles className="h-3 w-3" /> Wardrobe-aware picks</Badge>
      </div>
      {recommendations.isPending ? <p className="text-sm text-muted-foreground">Loading recommendations…</p>
        : recommendations.isError ? <EmptyState title="Recommendations unavailable"
          description={recommendations.error.message} action={{ label: "Retry", onClick: () => void recommendations.refetch() }} />
        : items.length === 0 ? <EmptyState icon={<ShoppingBag />} title="No matching recommendations"
          description="Try another filter. If the catalog is empty, an authorized product feed needs to be configured."
          action={{ label: "Clear filters", onClick: () => { setSearch(""); setCats([]); setStores([]); setPage(1); } }} />
        : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => <AIRecommendationCard key={item.id} item={cardItem(item)}
            detailsHref={`/shopping/${item.id}`} isWishlisted={item.wishlisted}
            onToggleWishlist={() => toggleWishlist.mutate({ item })} index={index} />)}
        </div>}
      {totalPages > 1 && <div className="mt-5 flex items-center justify-center gap-3">
        <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
        <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
        <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
      </div>}
    </div>

    <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-label-sm mb-1">Your collection</p><p className="text-display-md">Wishlist</p></div>
        <Badge variant="muted">{saved.length} saved</Badge>
      </div>
      {wishlist.isPending ? <p className="text-sm text-muted-foreground">Loading wishlist…</p>
        : wishlist.isError ? <EmptyState title="Wishlist unavailable" description={wishlist.error.message}
          action={{ label: "Retry", onClick: () => void wishlist.refetch() }} />
        : saved.length === 0 ? <p className="text-sm text-muted-foreground">Bookmark a recommendation to revisit it here after you log back in.</p>
        : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((row, index) => <AIRecommendationCard key={row.id} item={cardItem(row.item)}
            detailsHref={row.item.available ? `/shopping/${row.item.id}` : undefined} isWishlisted
            onToggleWishlist={() => toggleWishlist.mutate({ item: row.item, wishlistItemId: row.id })} index={index} />)}
        </div>}
    </div>

    <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-label-sm mb-1">Recommendation engine</p>
          <p className="text-display-md">Why these pieces are suggested</p></div>
        <Button variant="outline" className="gap-2" disabled={refresh.isPending} onClick={() => refresh.mutate()}>
          <Sparkles className="h-4 w-4" /> Refresh reasoning</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {reasoning.length ? reasoning.map((item) => <div key={item.id}
          className="rounded-2xl bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">
          <span className="font-semibold text-foreground">{item.title}: </span>{item.reason}</div>)
          : <p className="text-sm text-muted-foreground">No recommendations to explain yet.</p>}
      </div>
    </div>

    <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
      <div className="mb-5"><p className="text-label-sm mb-1">Price comparison</p>
        <p className="text-display-md">{bestComparison ? `${bestComparison.title} offer observations` : "No verified offers"}</p>
        {bestComparison && <Link href={`/shopping/${bestComparison.id}`} className="mt-1 inline-block text-xs font-medium text-brand-dark hover:underline">View all product details and offers</Link>}
        {new Set(comparisonRows.map((offer) => offer.currency)).size > 1 && <p className="mt-2 text-xs text-muted-foreground">Different currencies are shown separately; no exchange conversion or cross-currency ranking is applied.</p>}</div>
      {comparisonRows.length ? <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead><tr className="border-b border-border/60"><th className="pb-3 text-left text-label-xs">Store</th>
          <th className="pb-3 text-left text-label-xs">Observed price</th><th className="pb-3 text-left text-label-xs">Availability</th>
          <th className="pb-3 text-left text-label-xs">Checked</th><th className="pb-3 text-left text-label-xs" /></tr></thead>
        <tbody className="divide-y divide-border/40">{comparisonRows.map((offer) => <tr key={offer.id}>
          <td className="py-3.5 font-medium">{offer.store}</td>
          <td className="py-3.5 font-semibold">{currency(offer.price, offer.currency)}</td>
          <td className="py-3.5"><Badge variant={offer.freshness === "stale" ? "warning" : "muted"} size="sm">
            {offer.freshness === "stale" ? "Old observation" : offer.availability ?? "Not confirmed"}</Badge></td>
          <td className="py-3.5 text-xs text-muted-foreground">{new Date(offer.observedAt).toLocaleString()}</td>
          <td className="py-3.5">{offer.canBuy && <Button size="xs" variant="outline" asChild><a href={offer.url}
            target="_blank" rel="noopener noreferrer">View <ArrowUpRight className="h-3 w-3" /></a></Button>}</td>
        </tr>)}</tbody></table></div>
        : <p className="text-sm text-muted-foreground">Sample products have no merchants, prices, discounts, or purchase links. Connect an authorized catalog feed for verified offers.</p>}
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
        <p className="text-label-sm mb-1">Gap detection</p><p className="text-display-md mb-5">Essentials worth considering</p>
        <div className="space-y-3">{gaps.length ? gaps.map((item) => <div key={item.id} className="rounded-2xl bg-muted/60 p-4">
          <p className="text-sm font-semibold">{item.title}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{item.reason}</p>
        </div>) : <p className="text-sm text-muted-foreground">No specific wardrobe or inspiration gaps match this catalog.</p>}</div>
      </div>
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
        <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-brand" /><p className="text-label-sm">Style alignment</p></div>
        <p className="text-display-md mb-5">Matched to your preferences</p>
        <div className="space-y-3">{styleMatches.length ? styleMatches.map((item) => <div key={item.id}
          className="rounded-2xl bg-muted/60 p-4"><p className="text-sm font-semibold">{item.title}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.reason}</p></div>)
          : <p className="text-sm text-muted-foreground">Save style preferences to see more tailored picks.</p>}</div>
      </div>
    </div>
  </DashboardShell>;
}
