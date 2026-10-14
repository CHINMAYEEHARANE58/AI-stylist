"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, Trash2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { outfitsApi } from "@/lib/api-client";

export default function SavedOutfitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [collection, setCollection] = useState("");
  const [success, setSuccess] = useState(false);
  const savedQuery = useQuery({ queryKey: ["saved-outfit", id], queryFn: () => outfitsApi.getSavedOne(id), retry: false });
  const saved = savedQuery.data?.data;

  useEffect(() => {
    if (!saved) return;
    setTitle(saved.outfit.title);
    setNotes(saved.notes ?? "");
    setCollection(saved.collection ?? "");
  }, [saved]);

  const update = useMutation({
    mutationFn: () => outfitsApi.updateSaved(id, {
      title: title.trim(), notes: notes.trim() || null, collection: collection.trim() || null,
    }),
    onSuccess: async () => {
      setSuccess(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["saved-outfit", id] }),
        queryClient.invalidateQueries({ queryKey: ["saved-outfits"] }),
        queryClient.invalidateQueries({ queryKey: ["outfit-lookbooks"] }),
      ]);
    },
  });
  const favorite = useMutation({
    mutationFn: () => outfitsApi.toggleFavorite(saved!.outfit.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["saved-outfit", id] });
      await queryClient.invalidateQueries({ queryKey: ["saved-outfits"] });
    },
  });
  const remove = useMutation({
    mutationFn: () => outfitsApi.deleteSaved(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["saved-outfits"] });
      void queryClient.invalidateQueries({ queryKey: ["outfit-lookbooks"] });
      router.push("/saved-outfits");
    },
  });
  const changed = Boolean(saved && (title !== saved.outfit.title || notes !== (saved.notes ?? "") || collection !== (saved.collection ?? "")));

  return (
    <DashboardShell heading="Saved Outfit" subheading="Review the pieces, add notes, and keep your lookbooks organized.">
      <Button variant="ghost" size="sm" className="w-fit gap-2" asChild>
        <Link href="/saved-outfits"><ArrowLeft className="h-4 w-4" /> Back to saved outfits</Link>
      </Button>
      {savedQuery.isPending ? <div role="status" className="rounded-3xl border border-border/60 bg-card p-8 text-sm text-muted-foreground">Loading outfit details…</div>
        : savedQuery.error || !saved ? <EmptyState icon={<Heart className="h-6 w-6" />} title="Outfit unavailable"
          description={savedQuery.error?.message ?? "This saved outfit could not be found."}
          action={{ label: "Try again", onClick: () => void savedQuery.refetch() }} />
        : <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge variant="accent" className="mb-2">{saved.outfit.aesthetic ?? "Styled look"}</Badge>
                  <h2 className="text-display-md">{saved.outfit.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{[saved.outfit.occasion, saved.outfit.season].filter(Boolean).join(" · ") || "Ready for your next occasion"}</p>
                </div>
                <Button variant={saved.outfit.favorite ? "accent" : "outline"} onClick={() => favorite.mutate()} disabled={favorite.isPending}>
                  <Heart className={`h-4 w-4 ${saved.outfit.favorite ? "fill-current" : ""}`} /> {saved.outfit.favorite ? "Favorite" : "Add favorite"}
                </Button>
              </div>
              {favorite.error && <p role="alert" className="mt-3 text-sm text-destructive">{favorite.error.message}</p>}
              {saved.outfit.explanation && <div className="mt-5 rounded-2xl bg-muted/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Styling rationale</p>
                <p className="mt-2 text-sm leading-6">{saved.outfit.explanation}</p>
              </div>}
            </div>
            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
              <p className="text-label-sm mb-4">Items in this outfit</p>
              <div className="space-y-2.5">
                {saved.outfit.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/50 px-4 py-3">
                  <div>
                    {item.clothingItem ? <Link href={`/wardrobe/${item.clothingItem.id}`} className="text-sm font-medium hover:text-brand-dark">{item.clothingItem.name}</Link>
                      : <p className="text-sm font-medium">{item.snapshotName}</p>}
                    <p className="text-xs text-muted-foreground">{item.snapshotCategory}</p>
                  </div>
                  {item.clothingItem ? <Badge variant="muted" size="sm">In wardrobe</Badge>
                    : <Badge variant="muted" size="sm">Removed from wardrobe</Badge>}
                </div>)}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card space-y-4">
              <p className="text-label-sm">Outfit details</p>
              <Input label="Outfit name" value={title} maxLength={160} onChange={(event) => { setTitle(event.target.value); setSuccess(false); }} />
              <div>
                <label htmlFor="outfit-notes" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Personal notes</label>
                <Textarea id="outfit-notes" value={notes} maxLength={1000} onChange={(event) => { setNotes(event.target.value); setSuccess(false); }}
                  placeholder="Where you wore it, how it felt, or what to try next…" className="mt-1.5 min-h-28" />
              </div>
              <Input label="Lookbook" value={collection} maxLength={100} onChange={(event) => { setCollection(event.target.value); setSuccess(false); }}
                placeholder="e.g. Office Minimal" />
              <p className="text-xs text-muted-foreground">Type a new lookbook name or use an existing one. Clear it to leave the lookbook.</p>
              {update.error && <p role="alert" className="text-sm text-destructive">{update.error.message}</p>}
              {success && <p role="status" className="text-sm text-brand-dark">Changes saved.</p>}
              <Button className="w-full" onClick={() => update.mutate()} loading={update.isPending} disabled={!changed || !title.trim() || update.isPending}>Save changes</Button>
            </div>
            <Button variant="outline" className="w-full gap-2" disabled={remove.isPending}
              onClick={() => { if (window.confirm("Remove this outfit from your saved looks?")) remove.mutate(); }}>
              <Trash2 className="h-4 w-4" /> Remove from saved
            </Button>
            {remove.error && <p role="alert" className="text-sm text-destructive">{remove.error.message}</p>}
          </div>
        </div>}
    </DashboardShell>
  );
}
