"use client";

import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, Heart, RefreshCcw, Share2, Sparkles } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips } from "@/components/ui/filter-chips";
import { outfitsApi, wardrobeApi, type StyleItemLookApi, type StyleItemOptions } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const AESTHETICS = ["Casual", "Elegant", "Office", "Party", "Travel", "Streetwear", "Romantic"];
const OCCASIONS = ["Casual", "Office", "Party", "Travel", "Brunch", "Date night"];
const SEASONS = ["Spring", "Summer", "Autumn", "Winter"];
const lookKey = (look: StyleItemLookApi) => `${look.aesthetic}|${look.occasion}|${[...look.clothingItemIds].sort().join("|")}`;

export default function StyleItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [selectedAesthetics, setAesthetics] = useState<string[]>(["Casual", "Elegant"]);
  const [occasion, setOccasion] = useState<string[]>([]);
  const [season, setSeason] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [savedLookKeys, setSavedLookKeys] = useState<string[]>([]);
  const [latestResult, setLatestResult] = useState<Awaited<ReturnType<typeof outfitsApi.styleItem>> | null>(null);

  const itemQuery = useQuery({ queryKey: ["wardrobe-item", id], queryFn: () => wardrobeApi.get(id), retry: false });
  const item = itemQuery.data?.data;
  const savedQuery = useQuery({ queryKey: ["saved-outfits"], queryFn: () => outfitsApi.getSaved({ perPage: 50 }) });
  const initialLooks = useQuery({
    queryKey: ["style-item-initial", id],
    queryFn: () => outfitsApi.styleItem(id, { aesthetics: selectedAesthetics }),
    enabled: Boolean(item),
    retry: false,
    refetchOnWindowFocus: false,
  });
  const regenerate = useMutation({
    mutationFn: (options: StyleItemOptions) => outfitsApi.styleItem(id, options),
    onSuccess: (result) => { setLatestResult(result); setActiveTab(0); },
  });
  const result = latestResult ?? initialLooks.data;
  const save = useMutation({
    mutationFn: (look: StyleItemLookApi) => outfitsApi.save({
      title: `Complete ${look.aesthetic} Look`,
      clothingItemIds: look.clothingItemIds,
      occasion: look.occasion,
      aesthetic: look.aesthetic,
      season: season[0],
      explanation: look.explanation,
      source: "AI_GENERATED",
      provider: result?.data.provider,
      providerModel: result?.data.model,
    }),
    onSuccess: (_saved, look) => {
      setSavedLookKeys((keys) => [...keys, lookKey(look)]);
      void queryClient.invalidateQueries({ queryKey: ["saved-outfits"] });
    },
  });

  const looks = result?.data.looks ?? [];
  const activeLook = looks[activeTab] ?? looks[0];
  const activeKey = activeLook ? lookKey(activeLook) : "";
  const isSaved = savedLookKeys.includes(activeKey) || Boolean(activeLook && savedQuery.data?.data.some(({ outfit }) =>
    outfit.aesthetic === activeLook.aesthetic && outfit.occasion === activeLook.occasion
      && outfit.items.length === activeLook.clothingItemIds.length
      && outfit.items.every(({ clothingItem }) => clothingItem !== null && activeLook.clothingItemIds.includes(clothingItem.id))));
  const loading = (initialLooks.isPending && Boolean(item)) || regenerate.isPending;
  const error = itemQuery.error ?? regenerate.error ?? (latestResult ? null : initialLooks.error);

  function requestLooks() {
    regenerate.mutate({ aesthetics: selectedAesthetics, occasion: occasion[0], season: season[0] });
  }

  return (
    <DashboardShell heading="Style This Item" subheading="One piece, styled multiple ways using only what you own.">
      <Button variant="ghost" size="sm" className="w-fit gap-2" asChild>
        <Link href="/wardrobe"><ArrowLeft className="h-4 w-4" /> Back to wardrobe</Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
            <div className="relative aspect-[3/4] overflow-hidden bg-muted">
              {item?.imageUrl && <Image src={item.imageUrl} alt={item.name} fill className="object-cover" priority unoptimized />}
              {item && <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <p className="text-sm font-semibold text-white">{item.name}</p>
                <p className="text-xs text-white/70">{[item.brand, item.colors[0]].filter(Boolean).join(" · ")}</p>
              </div>}
            </div>
            <div className="p-4"><div className="flex flex-wrap gap-1.5">
              {[item?.category, item?.aesthetics[0], item?.seasons[0]].filter(Boolean).map((tag) => (
                <Badge key={tag} variant="muted" size="sm">{tag}</Badge>
              ))}
            </div></div>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card space-y-3">
            <p className="text-label-sm">Style aesthetics</p>
            <FilterChips options={AESTHETICS} selected={selectedAesthetics} onChange={(values) => setAesthetics(values.slice(-4))} />
            <p className="text-label-sm">Occasion</p>
            <FilterChips options={OCCASIONS} selected={occasion} onChange={(values) => setOccasion(values.slice(-1))} />
            <p className="text-label-sm">Season</p>
            <FilterChips options={SEASONS} selected={season} onChange={(values) => setSeason(values.slice(-1))} />
            <Button className="w-full gap-2 mt-2" onClick={requestLooks} loading={regenerate.isPending} disabled={!item || loading}>
              <Sparkles className="h-4 w-4" />{regenerate.isPending ? "Styling…" : "Regenerate looks"}
            </Button>
          </div>
        </div>

        <div className="space-y-5">
          {itemQuery.isPending || (loading && !activeLook) ? (
            <div className="rounded-3xl border border-border/60 bg-card p-8 text-sm text-muted-foreground" role="status">Styling your wardrobe pieces…</div>
          ) : error && !activeLook ? (
            <EmptyState icon={<Sparkles className="h-6 w-6" />} title="Could not style this item" description={error.message}
              action={{ label: "Try again", onClick: () => itemQuery.isError ? void itemQuery.refetch() : requestLooks() }} />
          ) : !activeLook ? (
            <EmptyState icon={<Sparkles className="h-6 w-6" />} title="Not enough suitable pieces"
              description={result?.message ?? "Add more wardrobe items or adjust your occasion and season filters."}
              action={{ label: "Try other options", onClick: requestLooks }} />
          ) : <>
            {error && <p role="alert" className="text-sm text-destructive">{error.message} Your previous looks are still available.</p>}
            {result?.data.provider === "mock" && <p className="text-xs text-muted-foreground">Development-only mock styling — connect an AI provider for real recommendations.</p>}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {looks.map((look, index) => (
                <button key={`${look.aesthetic}-${index}`} type="button" onClick={() => setActiveTab(index)}
                  className={cn("flex-none rounded-xl px-4 py-2 text-sm font-medium transition-all", activeTab === index
                    ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground")}>
                  {look.aesthetic}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={`${activeLook.aesthetic}-${activeTab}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
                <div className="flex items-start justify-between gap-4 mb-5"><div>
                  <Badge variant="accent" className="mb-2">{activeLook.aesthetic}</Badge>
                  <p className="text-display-md">Complete {activeLook.aesthetic} Look</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{activeLook.explanation}</p>
                </div></div>
                <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#faf5ef] to-[#e8d5bc] p-5 dark:from-[#1a1410] dark:to-[#2e1f16] mb-5">
                  <div className="space-y-2.5">
                    {activeLook.clothingItems.map((piece, index) => (
                      <motion.div key={piece.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.08 }}
                        className={cn("flex items-center gap-3 rounded-2xl bg-background/70 px-4 py-3 backdrop-blur-sm", piece.id === id && "border border-brand/40 bg-brand/5")}>
                        <div className={cn("h-2 w-2 rounded-full shrink-0", piece.id === id ? "bg-brand" : "bg-muted-foreground/40")} />
                        <span className="text-sm font-medium">{piece.name}</span>
                        {piece.id === id && <Badge variant="accent" size="sm" className="ml-auto">Anchor piece</Badge>}
                      </motion.div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-muted/50 p-4 mb-5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Styling rationale</p>
                  <p className="text-sm leading-6">{activeLook.explanation}</p>
                </div>
                {save.error && <p role="alert" className="mb-3 text-sm text-destructive">{save.error.message}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button className="gap-2" variant={isSaved ? "accent" : "default"}
                    onClick={() => save.mutate(activeLook)} disabled={isSaved || save.isPending} loading={save.isPending}>
                    <Heart className={cn("h-4 w-4", isSaved && "fill-current")} />
                    {isSaved ? "Saved" : "Save look"}
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={requestLooks} disabled={loading}>
                    <RefreshCcw className="h-4 w-4" /> Regenerate
                  </Button>
                  <Button variant="outline" size="icon" disabled title="Sharing is not available yet"><Share2 className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" disabled title="Download is not available yet"><Download className="h-4 w-4" /></Button>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="grid gap-3 sm:grid-cols-2">
              {looks.map((look, index) => index === activeTab ? null : (
                <motion.button key={`${look.aesthetic}-${index}`} type="button" onClick={() => setActiveTab(index)}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}
                  className="rounded-2xl border border-border/60 bg-card p-4 text-left hover:shadow-card-hover hover:-translate-y-0.5 transition-all shadow-card">
                  <Badge variant="muted" size="sm" className="mb-2">{look.aesthetic}</Badge>
                  <div className="space-y-1 mb-2">
                    {look.clothingItems.slice(0, 2).map((piece) => <p key={piece.id} className="text-xs text-muted-foreground truncate">{piece.name}</p>)}
                    {look.clothingItems.length > 2 && <p className="text-xs text-muted-foreground">+{look.clothingItems.length - 2} more</p>}
                  </div>
                  <p className="text-xs text-brand-dark font-medium">View look →</p>
                </motion.button>
              ))}
            </div>
          </>}
        </div>
      </div>
    </DashboardShell>
  );
}
