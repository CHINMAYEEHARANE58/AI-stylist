"use client";

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
import { outfitsApi } from "@/lib/api-client";
import type { OutfitSuggestion } from "@/lib/types";

export default function SavedOutfitsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const savedQuery = useQuery({ queryKey: ["saved-outfits"], queryFn: () => outfitsApi.getSaved({ perPage: 50 }) });
  const remove = useMutation({
    mutationFn: (id: string) => outfitsApi.deleteSaved(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["saved-outfits"] }),
  });
  const saved = savedQuery.data?.data ?? [];
  const cards: OutfitSuggestion[] = saved.map(({ id, outfit }) => ({
    id,
    title: outfit.title,
    mood: outfit.aesthetic ?? "Styled look",
    occasion: outfit.occasion ?? "Any occasion",
    weather: outfit.season ?? "All seasons",
    items: outfit.items.map(({ clothingItem }) => clothingItem?.name ?? "Removed item"),
    accent: "",
    notes: outfit.explanation ?? "Saved from your wardrobe.",
  }));

  function removeSaved(id: string) {
    if (window.confirm("Remove this outfit from your saved looks?")) remove.mutate(id);
  }

  return (
    <DashboardShell heading="Saved Outfits" subheading="Your favourite AI-generated looks, ready to wear again.">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{savedQuery.data?.meta.total ?? 0} saved {(savedQuery.data?.meta.total ?? 0) === 1 ? "outfit" : "outfits"}</p>
          {saved.length > 0 && <Badge variant="accent"><Heart className="h-3 w-3" /> Collection</Badge>}
        </div>
        <Button size="sm" asChild><Link href="/outfits"><Sparkles className="h-3.5 w-3.5" /> Generate more</Link></Button>
      </div>

      {savedQuery.isPending ? (
        <div role="status" className="rounded-3xl border border-border/60 bg-card p-8 text-sm text-muted-foreground">Loading saved outfits…</div>
      ) : savedQuery.error ? (
        <EmptyState icon={<Heart className="h-6 w-6" />} title="Could not load saved outfits" description={savedQuery.error.message}
          action={{ label: "Try again", onClick: () => void savedQuery.refetch() }} />
      ) : saved.length === 0 ? (
        <EmptyState icon={<Heart className="h-6 w-6" />} title="No saved outfits yet"
          description="Generate outfits and save the ones you love. They'll appear here."
          action={{ label: "Generate outfits", onClick: () => { window.location.href = "/outfits"; } }} />
      ) : (
        <>
          {remove.error && <p role="alert" className="text-sm text-destructive">{remove.error.message}</p>}
          <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
            className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((outfit, index) => (
              <OutfitCard key={outfit.id} outfit={outfit} isSaved onToggleSave={removeSaved}
                onRegenerate={(savedId) => {
                  const anchorId = saved.find((entry) => entry.id === savedId)?.outfit.items[0]?.clothingItem?.id;
                  if (anchorId) router.push(`/style-item/${anchorId}`);
                }} index={index} />
            ))}
          </motion.div>
        </>
      )}
    </DashboardShell>
  );
}
