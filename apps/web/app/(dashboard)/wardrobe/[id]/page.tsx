"use client";

import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Archive, ArrowLeft, Heart, Pencil, Shirt, Sparkles, Tag, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips } from "@/components/ui/filter-chips";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { ApiError, wardrobeApi, type ClothingItemApi } from "@/lib/api-client";

const CATEGORIES = ["Tops", "Shirts", "Blazers", "Jeans", "Trousers", "Skirts", "Dresses", "Shoes", "Sneakers", "Accessories", "Outerwear"];
const SEASONS = ["All season", "Spring", "Summer", "Autumn", "Winter"];
const OCCASIONS = ["Office", "Casual", "Party", "Brunch", "Travel", "Date night", "Vacation"];
const STYLES = ["Minimal", "Classic", "Elegant", "Casual", "Streetwear", "Quiet luxury", "Old money", "Romantic"];
const errorMessage = (error: unknown) => error instanceof ApiError ? error.message : "Please try again.";

type EditState = { name: string; category: string; subcategory: string; colors: string; pattern: string; material: string; seasons: string[]; occasions: string[]; aesthetics: string[]; brand: string; notes: string; imageUrl: string };
const editStateFor = (item: ClothingItemApi): EditState => ({ name: item.name, category: item.category, subcategory: item.subcategory ?? "", colors: item.colors.join(", "), pattern: item.pattern ?? "", material: item.material ?? "", seasons: item.seasons, occasions: item.occasions, aesthetics: item.aesthetics, brand: item.brand ?? "", notes: item.notes ?? "", imageUrl: item.imageUrl });

export default function ClothingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const itemQuery = useQuery({ queryKey: ["wardrobe-item", id], queryFn: () => wardrobeApi.get(id) });
  const item = itemQuery.data?.data;
  const invalidate = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["wardrobe"] }), queryClient.invalidateQueries({ queryKey: ["wardrobe-summary"] }), queryClient.invalidateQueries({ queryKey: ["wardrobe-item", id] })]);
  const favoriteMutation = useMutation({ mutationFn: () => wardrobeApi.toggleFavorite(id), onSuccess: async () => { await invalidate(); }, onError: (error) => toast(errorMessage(error), "error") });
  const archiveMutation = useMutation({ mutationFn: () => wardrobeApi.toggleArchive(id), onSuccess: async (result) => { await invalidate(); toast(result.message, "success"); }, onError: (error) => toast(errorMessage(error), "error") });
  const updateMutation = useMutation({ mutationFn: (data: Partial<ClothingItemApi>) => wardrobeApi.update(id, data), onSuccess: async () => { await invalidate(); setEditing(false); toast("Item details saved.", "success"); }, onError: (error) => toast(errorMessage(error), "error") });
  const deleteMutation = useMutation({ mutationFn: () => wardrobeApi.delete(id), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["wardrobe"] }); await queryClient.invalidateQueries({ queryKey: ["wardrobe-summary"] }); toast("Item deleted.", "success"); router.replace("/wardrobe"); }, onError: (error) => toast(errorMessage(error), "error") });

  const submitEdit = () => {
    if (!edit?.name.trim() || !edit.category) return toast("Name and category are required.", "error");
    updateMutation.mutate({ name: edit.name.trim(), category: edit.category, subcategory: edit.subcategory.trim() || undefined, colors: edit.colors.split(",").map((value) => value.trim()).filter(Boolean), pattern: edit.pattern.trim() || undefined, material: edit.material.trim() || undefined, seasons: edit.seasons, occasions: edit.occasions, aesthetics: edit.aesthetics, brand: edit.brand.trim() || undefined, notes: edit.notes.trim() || undefined, imageUrl: edit.imageUrl.trim() || undefined });
  };

  if (itemQuery.isLoading) return <DashboardShell heading="Loading item" subheading=""><div className="grid gap-8 lg:grid-cols-[420px_1fr]"><div className="aspect-[4/5] animate-pulse rounded-3xl bg-muted" /><div className="h-64 animate-pulse rounded-3xl bg-muted" /></div></DashboardShell>;
  if (itemQuery.isError || !item) return <DashboardShell heading="Item unavailable" subheading=""><EmptyState icon={<Shirt className="h-6 w-6" />} title="Could not load this item" description={itemQuery.isError ? errorMessage(itemQuery.error) : "This item no longer exists."} action={{ label: "Back to wardrobe", onClick: () => router.replace("/wardrobe") }} /></DashboardShell>;

  const meta = [["Brand", item.brand], ["Colour", item.colors.join(", ")], ["Fabric", item.material], ["Pattern", item.pattern], ["Season", item.seasons.join(", ")], ["Occasion", item.occasions.join(", ")], ["Style", item.aesthetics.join(", ")], ["Category", [item.category, item.subcategory].filter(Boolean).join(" · ")]];
  return <DashboardShell heading={item.name} subheading={[item.brand, item.colors[0]].filter(Boolean).join(" · ")}>
    <Button variant="ghost" size="sm" className="w-fit gap-2" asChild><Link href="/wardrobe"><ArrowLeft className="h-4 w-4" />Back to wardrobe</Link></Button>
    <div className="grid gap-8 lg:grid-cols-[420px_1fr]"><motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}><div className="overflow-hidden rounded-3xl border border-border/60 bg-muted"><Image src={item.imageUrl} alt={item.name} width={840} height={1050} className="w-full object-cover" priority /></div><div className="mt-4 flex flex-wrap gap-2"><Button variant={item.favorite ? "accent" : "outline"} className="flex-1 gap-2" onClick={() => favoriteMutation.mutate()} disabled={favoriteMutation.isPending}><Heart className={`h-4 w-4 ${item.favorite ? "fill-current" : ""}`} />{item.favorite ? "Favourited" : "Add to favourites"}</Button><Button variant="outline" size="icon" onClick={() => { setEdit(editStateFor(item)); setEditing(true); }} aria-label="Edit item"><Pencil className="h-4 w-4" /></Button><Button variant="outline" size="icon" onClick={() => archiveMutation.mutate()} disabled={archiveMutation.isPending} aria-label={item.archived ? "Restore item" : "Archive item"}><Archive className="h-4 w-4" /></Button><Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(true)} aria-label="Delete item"><Trash2 className="h-4 w-4" /></Button></div></motion.div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="space-y-6"><div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card"><div className="flex items-center gap-2 mb-5"><Tag className="h-4 w-4 text-brand" /><p className="text-sm font-medium">Item details</p>{item.archived && <Badge variant="muted" size="sm">Archived</Badge>}</div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{meta.map(([label, value]) => <div key={label} className="rounded-2xl bg-muted/60 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p><p className="text-sm font-medium capitalize">{value || "—"}</p></div>)}</div>{item.notes && <p className="mt-5 text-sm leading-6 text-muted-foreground">{item.notes}</p>}</div><div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card"><div className="flex items-center gap-2 mb-3"><Sparkles className="h-4 w-4 text-brand" /><p className="text-sm font-medium">Style this item</p></div><p className="text-sm leading-6 text-muted-foreground">Use the style studio to generate outfit ideas based on this item and your real wardrobe.</p></div><div className="flex flex-wrap gap-3"><Button className="gap-2 flex-1" asChild><Link href={`/style-item/${item.id}`}><Sparkles className="h-4 w-4" />Full style studio</Link></Button><Button variant="outline" className="gap-2 flex-1" asChild><Link href="/outfits"><Shirt className="h-4 w-4" />Generate outfit</Link></Button></div></motion.div></div>
    <Dialog open={editing} onOpenChange={setEditing}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Edit item</DialogTitle><DialogDescription>Update the details stored in your digital wardrobe.</DialogDescription></DialogHeader>{edit && <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1"><div className="grid gap-4 sm:grid-cols-2"><Input label="Item name" value={edit.name} onChange={(event) => setEdit({ ...edit, name: event.target.value })} /><Input label="Brand" value={edit.brand} onChange={(event) => setEdit({ ...edit, brand: event.target.value })} /><Input label="Image URL" value={edit.imageUrl} onChange={(event) => setEdit({ ...edit, imageUrl: event.target.value })} /><Input label="Colour(s), comma-separated" value={edit.colors} onChange={(event) => setEdit({ ...edit, colors: event.target.value })} /><Input label="Subcategory" value={edit.subcategory} onChange={(event) => setEdit({ ...edit, subcategory: event.target.value })} /><Input label="Fabric" value={edit.material} onChange={(event) => setEdit({ ...edit, material: event.target.value })} /><Input label="Pattern" value={edit.pattern} onChange={(event) => setEdit({ ...edit, pattern: event.target.value })} /></div><div><p className="text-label-xs mb-2">Category</p><FilterChips options={CATEGORIES} selected={[edit.category]} multi={false} onChange={(values) => setEdit({ ...edit, category: values[0] ?? "" })} /></div><div><p className="text-label-xs mb-2">Season</p><FilterChips options={SEASONS} selected={edit.seasons} onChange={(values) => setEdit({ ...edit, seasons: values })} /></div><div><p className="text-label-xs mb-2">Occasion</p><FilterChips options={OCCASIONS} selected={edit.occasions} onChange={(values) => setEdit({ ...edit, occasions: values })} /></div><div><p className="text-label-xs mb-2">Style</p><FilterChips options={STYLES} selected={edit.aesthetics} onChange={(values) => setEdit({ ...edit, aesthetics: values })} /></div><Textarea label="Notes" value={edit.notes} onChange={(event) => setEdit({ ...edit, notes: event.target.value })} /></div>}<DialogFooter><Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button><Button onClick={submitEdit} loading={updateMutation.isPending}>Save changes</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}><DialogContent><DialogHeader><DialogTitle>Delete this item?</DialogTitle><DialogDescription>This permanently removes {item.name} from your wardrobe. This cannot be undone.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button><Button variant="destructive" onClick={() => deleteMutation.mutate()} loading={deleteMutation.isPending}><Trash2 className="h-4 w-4" />Delete item</Button></DialogFooter></DialogContent></Dialog>
  </DashboardShell>;
}
