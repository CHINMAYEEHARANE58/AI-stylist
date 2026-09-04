"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, RefreshCcw, Sparkles, TrendingUp } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AIRecommendationCard } from "@/components/ui/ai-recommendation-card";
import { FilterChips } from "@/components/ui/filter-chips";
import { SearchBar } from "@/components/ui/search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  shoppingRecommendations, comparisonRows,
  wardrobeGaps, trendInsights,
} from "@/lib/mock-data";
import { useAppStore } from "@/store/app-store";
import { currency, discount } from "@/lib/utils";

const CATEGORIES = ["All", "Tops", "Bottoms", "Shoes", "Accessories", "Outerwear", "Blazers"];
const STORES     = ["All stores", "Zara", "H&M", "Myntra", "Ajio", "Amazon", "ASOS", "COS"];

export default function ShoppingPage() {
  const { wishlistIds, toggleWishlist } = useAppStore();
  const [search,       setSearch]       = useState("");
  const [activeCats,   setCats]         = useState<string[]>([]);
  const [activeStores, setStores]       = useState<string[]>([]);

  const filtered = shoppingRecommendations.filter((item) => {
    const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase());
    const matchCat  = !activeCats.length  || activeCats.some((c) => item.category?.toLowerCase().includes(c.toLowerCase()));
    const matchStore = !activeStores.length || activeStores.includes(item.store);
    return matchSearch && matchCat && matchStore;
  });

  return (
    <DashboardShell
      heading="AI Shopping Assistant"
      subheading="Targeted recommendations based on your wardrobe gaps, style profile, and price comparisons across top retailers."
    >
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar
          containerClassName="flex-1 min-w-[200px]"
          placeholder="Search recommendations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
        />
        <Button variant="outline" className="gap-2">
          <RefreshCcw className="h-4 w-4" /> Refresh picks
        </Button>
      </div>

      <FilterChips options={CATEGORIES.slice(1)} selected={activeCats} onChange={setCats} />

      {/* ── Recommendations grid ── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-label-sm">{filtered.length} recommendations</p>
          <Badge variant="accent"><Sparkles className="h-3 w-3" /> AI curated</Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item, i) => (
            <AIRecommendationCard
              key={item.id}
              item={item}
              isWishlisted={wishlistIds.includes(item.id)}
              onToggleWishlist={toggleWishlist}
              index={i}
            />
          ))}
        </div>
      </div>

      {/* ── AI reasoning ── */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div>
            <p className="text-label-sm mb-1">Recommendation engine</p>
            <p className="text-display-md">Why AI suggests these pieces</p>
          </div>
          <Button variant="outline" className="gap-2 w-fit">
            <Sparkles className="h-4 w-4" /> Refresh reasoning
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            "You need neutral sneakers to improve outfit compatibility across office, brunch, and vacation looks.",
            "A structured ivory tank will raise similarity scores on 12 of your saved Pinterest inspirations.",
            "Relaxed trousers would increase your hot-weather office outfit combinations by 31%.",
          ].map((note) => (
            <div key={note} className="rounded-2xl bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">{note}</div>
          ))}
        </div>
      </div>

      {/* ── Price comparison ── */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
        <div className="mb-5">
          <p className="text-label-sm mb-1">Price comparison</p>
          <p className="text-display-md">Neutral Leather Sneakers across retailers</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="pb-3 text-left text-label-xs w-32">Store</th>
                <th className="pb-3 text-left text-label-xs">Price</th>
                <th className="pb-3 text-left text-label-xs">Discount</th>
                <th className="pb-3 text-left text-label-xs hidden sm:table-cell">Rating</th>
                <th className="pb-3 text-left text-label-xs hidden md:table-cell">Delivery</th>
                <th className="pb-3 text-left text-label-xs">Availability</th>
                <th className="pb-3 text-left text-label-xs"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {comparisonRows.map((row, i) => {
                const isBest = i === comparisonRows.reduce(
                  (best, r, idx) => (r.price < comparisonRows[best].price ? idx : best), 0
                );
                return (
                  <tr key={row.store} className={`transition-colors ${isBest ? "bg-success/5" : "hover:bg-muted/30"}`}>
                    <td className="py-3.5 font-medium flex items-center gap-2">
                      {row.store}
                      {isBest && <Badge variant="success" size="sm">Best price</Badge>}
                    </td>
                    <td className="py-3.5 font-semibold">{currency(row.price)}</td>
                    <td className="py-3.5">
                      <Badge variant="accent" size="sm">{row.discount}% off</Badge>
                    </td>
                    <td className="py-3.5 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Progress value={row.rating * 20} className="h-1.5 w-16" indicatorClassName="bg-brand" />
                        <span className="text-xs text-muted-foreground">{row.rating}</span>
                      </div>
                    </td>
                    <td className="py-3.5 hidden md:table-cell text-muted-foreground text-xs">
                      {row.deliveryDays}d delivery
                    </td>
                    <td className="py-3.5">
                      <Badge
                        variant={row.availability === "In stock" ? "success" : "warning"}
                        size="sm"
                      >
                        {row.availability}
                      </Badge>
                    </td>
                    <td className="py-3.5">
                      <Button size="xs" variant="outline" className="gap-1">
                        Buy <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Wardrobe gaps + trends ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Gaps */}
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
          <p className="text-label-sm mb-1">Gap detection</p>
          <p className="text-display-md mb-5">Essentials worth adding</p>
          <div className="space-y-3">
            {wardrobeGaps.map((gap) => (
              <div key={gap.title} className="rounded-2xl bg-muted/60 p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold">{gap.title}</p>
                  <Badge
                    variant={gap.priority === "High" ? "destructive" : gap.priority === "Medium" ? "warning" : "muted"}
                    size="sm"
                  >
                    {gap.priority}
                  </Badge>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">{gap.reason}</p>
                {gap.suggestedBudget && (
                  <p className="mt-2 text-xs font-medium text-brand-dark">{gap.suggestedBudget}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trends */}
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-brand" />
            <p className="text-label-sm">Trend insights</p>
          </div>
          <p className="text-display-md mb-5">Matched to your style</p>
          <div className="space-y-3">
            {trendInsights.map((t) => (
              <div key={t.title} className="rounded-2xl bg-muted/60 p-4">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <p className="text-sm font-semibold">{t.title}</p>
                  {t.matchScore && (
                    <span className="text-xs font-medium text-brand-dark">{t.matchScore}% match</span>
                  )}
                </div>
                <p className="text-xs leading-5 text-muted-foreground">{t.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
