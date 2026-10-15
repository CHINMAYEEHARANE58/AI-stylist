"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight, CloudSun, Heart, Plus, Shirt, MessageCircle,
  ShoppingBag, Sparkles, TrendingUp,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { OutfitCard } from "@/components/ui/outfit-card";
import { EmptyState } from "@/components/ui/empty-state";
import { AIRecommendationCard } from "@/components/ui/ai-recommendation-card";
import { insightsApi, outfitsApi, shoppingApi, weatherApi } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import type { OutfitSuggestion } from "@/lib/types";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function DashboardPage() {
  const user = useAppStore((state) => state.user);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Real data from backend
  const { data: dashData, isPending: dashboardPending, error: dashboardError, refetch: refetchDashboard } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => insightsApi.dashboard(),
    staleTime: 30_000,
  });
  const { data: shopData } = useQuery({
    queryKey: ["shopping-dashboard"],
    queryFn: () => shoppingApi.list({ perPage: 3 }),
    staleTime: 60_000,
  });
  const weatherQuery = useQuery({ queryKey: ["dashboard-weather"], queryFn: () => weatherApi.current(), staleTime: 15 * 60_000 });
  const insightsQuery = useQuery({ queryKey: ["dashboard-style-insights"], queryFn: () => insightsApi.wardrobe(), staleTime: 60_000 });
  const weather = weatherQuery.data?.data;
  const colorCounts = insightsQuery.data?.data.colors ?? [];
  const colorTotal = colorCounts.reduce((sum, color) => sum + color.value, 0);

  const stats = dashData?.data?.stats;
  const recentSaved = dashData?.data?.recentSavedOutfits[0];
  const recentSavedCard: OutfitSuggestion | null = recentSaved ? {
    id: recentSaved.id,
    title: recentSaved.outfit.title,
    mood: recentSaved.outfit.aesthetic ?? "Styled look",
    occasion: recentSaved.outfit.occasion ?? "Any occasion",
    weather: recentSaved.outfit.season ?? "All seasons",
    items: recentSaved.outfit.items.map((item) => item.clothingItem?.name ?? item.snapshotName),
    accent: "",
    notes: recentSaved.notes || recentSaved.outfit.explanation || "Saved from your wardrobe.",
  } : null;
  const removeSaved = useMutation({
    mutationFn: (id: string) => outfitsApi.deleteSaved(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["saved-outfits"] });
      void queryClient.invalidateQueries({ queryKey: ["outfit-lookbooks"] });
    },
  });
  const recentItems = dashData?.data?.recentWardrobeItems ?? [];
  const liveNotifications = dashData?.data?.notifications ?? [];
  const shopItems = shopData?.data ?? [];
  const toggleShopWishlist = useMutation({
    mutationFn: async (item: typeof shopItems[number]) => item.wishlisted
      ? shoppingApi.removeFromWishlist(item.id) : shoppingApi.addToWishlist(item.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["shopping-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["shopping"] });
      void queryClient.invalidateQueries({ queryKey: ["shopping-wishlist"] });
    },
  });

  const displayWardrobeCount = stats?.wardrobeItems ?? "—";
  const displaySavedCount    = stats?.savedOutfits ?? 0;
  const displayNotifications = liveNotifications;
  const displayWardrobeItems = recentItems.slice(0, 4).map((i) => ({ id: i.id, name: i.name, imageUrl: i.imageUrl, brand: i.brand ?? "" }));
  const displayShop = shopItems.slice(0, 3).map((i) => ({
    id: i.id, title: i.title, price: i.price, originalPrice: i.originalPrice,
    brand: i.brand, store: i.store, similarity: i.relevance,
    image: i.imageUrl ?? "/shopping-1.svg", url: i.url, reason: i.reason,
    isSample: i.isSample, available: i.available, currency: i.currency,
  }));

  return (
    <DashboardShell
      heading={`Good morning, ${user?.name?.split(" ")[0] ?? "there"}`}
      subheading="Here's everything your wardrobe has for you today."
    >
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

        {/* ── Row 1: weather + quick stats ── */}
        <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Weather card */}
          <div className="relative col-span-2 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-[#faf5ef] to-[#e8d5bc] p-6 shadow-card dark:from-[#1a1410] dark:to-[#2e1f16]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-label-sm text-foreground/60 mb-1">{weather?.available ? `Today · ${weather.city}` : "Weather context"}</p>
                <p className="text-display-xl">{weather?.available ? `${Math.round(weather.temperatureC)}°C` : "—"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{weather?.available ? weather.condition : weatherQuery.isError ? "Weather could not be loaded." : weather?.reason ?? "Loading weather…"}</p>
              </div>
              <CloudSun className="h-12 w-12 text-brand opacity-70" />
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-background/50 px-4 py-2.5 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              <span className="text-xs font-medium">{weather?.available ? `${weather.stylingTip} Retrieved ${new Date(weather.retrievedAt).toLocaleString()} · Open-Meteo` : "Select a weather city in Style Profile to enable weather context."}</span>
            </div>
          </div>

          {[
            { label: "Wardrobe items",    value: displayWardrobeCount, icon: Shirt,   href: "/wardrobe",  color: "text-blue-500" },
            { label: "Saved outfits",     value: displaySavedCount,    icon: Heart,   href: "/saved-outfits",   color: "text-rose-500" },
          ].map(({ label, value, icon: Icon, href, color }) => (
            <Link key={label} href={href} className="group">
              <div className="flex h-full flex-col justify-between rounded-3xl border border-border/60 bg-card p-6 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5">
                <Icon className={`h-6 w-6 ${color}`} />
                <div className="mt-4">
                  <p className="text-display-xl">{value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{label}</p>
                </div>
                <ArrowRight className="mt-3 h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </Link>
          ))}
        </motion.div>

        {/* ── Row 2: today's outfit + quick actions ── */}
        <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-3">
          {/* Today's outfit */}
          <div className="lg:col-span-2">
            {dashboardPending ? <div role="status" className="min-h-64 rounded-3xl border border-border/60 bg-card p-8 text-sm text-muted-foreground">Loading your saved looks…</div>
              : dashboardError ? <EmptyState icon={<Heart className="h-6 w-6" />} title="Could not load saved looks"
                description={dashboardError.message} action={{ label: "Try again", onClick: () => void refetchDashboard() }} />
              : recentSavedCard ? <OutfitCard outfit={recentSavedCard} isSaved detailHref={`/saved-outfits/${recentSavedCard.id}`}
                onToggleSave={(id) => { if (window.confirm("Remove this outfit from your saved looks?")) removeSaved.mutate(id); }} index={0} />
              : <EmptyState icon={<Heart className="h-6 w-6" />} title="No saved outfit yet"
                description="Save an outfit you love and it will appear here."
                action={{ label: "Generate an outfit", onClick: () => router.push("/outfits") }} />}
            {removeSaved.error && <p role="alert" className="mt-2 text-sm text-destructive">{removeSaved.error.message}</p>}
          </div>

          {/* Quick actions */}
          <div className="flex flex-col gap-3">
            <p className="text-label-sm px-1">Quick actions</p>
            {[
              { label: "Generate new outfit", icon: Sparkles,   href: "/outfits",         variant: "default" as const },
              { label: "Ask AI stylist",       icon: MessageCircle, href: "/stylist",       variant: "outline" as const },
              { label: "Add wardrobe item",   icon: Plus,        href: "/wardrobe/upload", variant: "outline" as const },
              { label: "Match a Pinterest look", icon: TrendingUp, href: "/pinterest-match", variant: "outline" as const },
              { label: "Browse shopping picks",  icon: ShoppingBag, href: "/shopping",       variant: "outline" as const },
            ].map(({ label, icon: Icon, href, variant }) => (
              <Button key={label} variant={variant} className="justify-start gap-3 h-12 rounded-2xl" asChild>
                <Link href={href}>
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </Button>
            ))}
          </div>
        </motion.div>

        {/* ── Row 3: wardrobe preview ── */}
        <motion.div variants={fadeUp}>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-display-sm">Recent wardrobe</p>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/wardrobe">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            {displayWardrobeItems.map((item) => (
              <Link key={item.id} href={`/wardrobe/${item.id}`} className="group">
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                  <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <p className="truncate text-xs font-medium">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.brand}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {!dashboardPending && !dashboardError && displayWardrobeItems.length === 0 && <p className="text-sm text-muted-foreground">No wardrobe items yet. Add your first item to see it here.</p>}
        </motion.div>

        {/* ── Row 4: style breakdown + notifications ── */}
        <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-2">
          {/* Style DNA */}
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
            <p className="text-label-sm mb-1">Style DNA</p>
            <p className="text-display-sm mb-5">Your wardrobe fingerprint</p>
            <div className="space-y-4">
              {colorCounts.map((c) => (
                <div key={c.label}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span>{c.label}</span>
                    <span className="text-muted-foreground">{c.value} items</span>
                  </div>
                  <Progress value={colorTotal ? Math.round(c.value * 100 / colorTotal) : 0} className="h-1.5" indicatorClassName="bg-brand" />
                </div>
              ))}
              {insightsQuery.isError && <Button variant="outline" onClick={() => void insightsQuery.refetch()}>Retry style insights</Button>}
              {!insightsQuery.isPending && !insightsQuery.isError && colorCounts.length === 0 && <p className="text-sm text-muted-foreground">Add wardrobe items to see your colour distribution.</p>}
            </div>
            <Button variant="outline" size="sm" className="mt-5 w-full" asChild>
              <Link href="/insights">Full insights <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>

          {/* Notifications */}
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-label-sm mb-1">Updates</p>
                <p className="text-display-sm">Recent alerts</p>
              </div>
              <Badge variant="destructive">{stats?.unreadNotifications ?? 0}</Badge>
            </div>
            <div className="space-y-2.5">
              {displayNotifications.slice(0, 4).map((n) => (
                <div
                  key={n.id}
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    n.read ? "bg-muted/50 text-muted-foreground" : "bg-brand/8 text-foreground"
                  }`}
                >
                  <p className="leading-5">{n.message}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{n.time}</p>
                </div>
              ))}
              {!dashboardPending && !dashboardError && displayNotifications.length === 0 && <p className="text-sm text-muted-foreground">No recent notifications.</p>}
            </div>
            <Button variant="ghost" size="sm" className="mt-4 w-full" asChild>
              <Link href="/notifications">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        </motion.div>

        {/* ── Row 5: shopping picks ── */}
        <motion.div variants={fadeUp}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-label-sm mb-1">AI Recommendations</p>
              <p className="text-display-sm">Picked for your wardrobe gaps</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/shopping">See all <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayShop.map((item, i) => (
              <AIRecommendationCard
                key={item.id}
                item={item}
                detailsHref={shopItems[i]?.available ? `/shopping/${shopItems[i].id}` : undefined}
                isWishlisted={shopItems[i]?.wishlisted ?? false}
                onToggleWishlist={() => { const selected = shopItems[i]; if (selected) toggleShopWishlist.mutate(selected); }}
                index={i}
              />
            ))}
            {displayShop.length === 0 && <p className="text-sm text-muted-foreground">No shopping recommendations available yet.</p>}
          </div>
        </motion.div>
      </motion.div>
    </DashboardShell>
  );
}
