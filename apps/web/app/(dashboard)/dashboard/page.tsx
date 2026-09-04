"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight, CloudSun, Heart, Plus, Shirt,
  ShoppingBag, Sparkles, TrendingUp, Zap,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { OutfitCard } from "@/components/ui/outfit-card";
import { AIRecommendationCard } from "@/components/ui/ai-recommendation-card";
import {
  outfitSuggestions, shoppingRecommendations,
  wardrobeItems, analytics, notifications,
} from "@/lib/mock-data";
import { useAppStore } from "@/store/app-store";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function DashboardPage() {
  const { savedOutfitIds, toggleSavedOutfit, wishlistIds, toggleWishlist, user } = useAppStore();

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
                <p className="text-label-sm text-foreground/60 mb-1">Today · Mumbai</p>
                <p className="text-display-xl">29°C</p>
                <p className="mt-1 text-sm text-muted-foreground">Humid, light rain later</p>
              </div>
              <CloudSun className="h-12 w-12 text-brand opacity-70" />
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-background/50 px-4 py-2.5 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              <span className="text-xs font-medium">AI suggests: camel blazer + closed footwear</span>
            </div>
          </div>

          {[
            { label: "Wardrobe items",    value: wardrobeItems.length, icon: Shirt,       href: "/wardrobe",  color: "text-blue-500" },
            { label: "Saved outfits",     value: savedOutfitIds.length, icon: Heart,      href: "/outfits",   color: "text-rose-500" },
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
            <OutfitCard
              outfit={outfitSuggestions[2]}
              isSaved={savedOutfitIds.includes(outfitSuggestions[2].id)}
              onToggleSave={toggleSavedOutfit}
              index={0}
            />
          </div>

          {/* Quick actions */}
          <div className="flex flex-col gap-3">
            <p className="text-label-sm px-1">Quick actions</p>
            {[
              { label: "Generate new outfit", icon: Sparkles,   href: "/outfits",         variant: "default" as const },
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
            {wardrobeItems.slice(0, 4).map((item) => (
              <Link key={item.id} href={`/wardrobe/${item.id}`} className="group">
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                  <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                    <Image
                      src={item.image}
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
        </motion.div>

        {/* ── Row 4: style breakdown + notifications ── */}
        <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-2">
          {/* Style DNA */}
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
            <p className="text-label-sm mb-1">Style DNA</p>
            <p className="text-display-sm mb-5">Your wardrobe fingerprint</p>
            <div className="space-y-4">
              {analytics.favoriteColors.map((c) => (
                <div key={c.label}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span>{c.label}</span>
                    <span className="text-muted-foreground">{c.value}%</span>
                  </div>
                  <Progress value={c.value} className="h-1.5" indicatorClassName="bg-brand" />
                </div>
              ))}
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
              <Badge variant="destructive">{notifications.filter((n) => !n.read).length}</Badge>
            </div>
            <div className="space-y-2.5">
              {notifications.slice(0, 4).map((n) => (
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
            {shoppingRecommendations.slice(0, 3).map((item, i) => (
              <AIRecommendationCard
                key={item.id}
                item={item}
                isWishlisted={wishlistIds.includes(item.id)}
                onToggleWishlist={toggleWishlist}
                index={i}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </DashboardShell>
  );
}
