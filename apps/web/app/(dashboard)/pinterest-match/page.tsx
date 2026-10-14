"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CloudUpload, ScanSearch, ShoppingBag, Sparkles, Trash2, X } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { inspirationApi, outfitsApi } from "@/lib/api-client";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function PinterestMatchPage() {
  const queryClient = useQueryClient();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedLookId, setSavedLookId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    const readLocation = () => setSelectedId(new URLSearchParams(window.location.search).get("id"));
    readLocation();
    window.addEventListener("popstate", readLocation);
    return () => window.removeEventListener("popstate", readLocation);
  }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function selectInspiration(id: string | null) {
    setSelectedId(id);
    const next = new URL(window.location.href);
    if (id) next.searchParams.set("id", id); else next.searchParams.delete("id");
    window.history.replaceState(null, "", next);
  }

  function chooseFile(nextFile: File) {
    setFileError(null);
    upload.reset();
    if (!ACCEPTED_TYPES.has(nextFile.type)) {
      setFileError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (nextFile.size === 0 || nextFile.size > MAX_UPLOAD_BYTES) {
      setFileError("Choose an image smaller than 10 MB.");
      return;
    }
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
    selectInspiration(null);
  }

  function clearUpload() {
    setFile(null);
    setPreview(null);
    setFileError(null);
  }

  const savedQuery = useQuery({ queryKey: ["inspirations", page], queryFn: () => inspirationApi.getSaved(page) });
  const detailQuery = useQuery({ queryKey: ["inspiration", selectedId], queryFn: () => inspirationApi.getOne(selectedId!), enabled: Boolean(selectedId), retry: false });
  const upload = useMutation({
    mutationFn: () => inspirationApi.analyze(file!),
    onSuccess: (response) => {
      queryClient.setQueryData(["inspiration", response.data.id], response);
      void queryClient.invalidateQueries({ queryKey: ["inspirations"] });
      clearUpload();
      selectInspiration(response.data.id);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => inspirationApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ["inspiration", id] });
      void queryClient.invalidateQueries({ queryKey: ["inspirations"] });
      selectInspiration(null);
    },
  });
  const detail = detailQuery.data?.data;
  const analysis = detail?.analysis;
  const saveLook = useMutation({
    mutationFn: () => outfitsApi.save({
      title: `Recreated: ${analysis!.detectedStyle}`.slice(0, 160),
      clothingItemIds: analysis!.recreationSuggestion.clothingItemIds,
      aesthetic: analysis!.detectedStyle.slice(0, 100),
      explanation: analysis!.recreationSuggestion.explanation,
      source: "INSPIRATION_MATCH",
    }),
    onSuccess: () => {
      setSavedLookId(selectedId);
      void queryClient.invalidateQueries({ queryKey: ["saved-outfits"] });
    },
  });

  return (
    <DashboardShell heading="Pinterest Match Studio" subheading="Upload an outfit screenshot and find approximate matches in your own wardrobe.">
      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card space-y-4">
            <p className="text-label-sm">Upload inspiration</p>
            <div className="flex gap-2">
              <Input placeholder="Pinterest connection unavailable" disabled className="flex-1" aria-label="Pinterest connection unavailable" />
              <Button variant="outline" size="icon" disabled aria-label="Pinterest connection unavailable"><ScanSearch className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">Pinterest URL import needs approved official API access. Upload a screenshot or image you have permission to use; no Pinterest pages are scraped.</p>

            {!preview ? <div onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => { event.preventDefault(); setDragOver(false); const selected = event.dataTransfer.files[0]; if (selected) chooseFile(selected); }}
              className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${dragOver ? "border-brand bg-brand/5" : "border-border hover:border-brand/40 hover:bg-muted/30"}`}>
              <CloudUpload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Drop outfit screenshot here</p>
              <p className="text-xs text-muted-foreground">PNG, JPG, or WebP up to 10 MB</p>
              <label className="cursor-pointer">
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Choose inspiration image"
                  onChange={(event) => { const selected = event.target.files?.[0]; if (selected) chooseFile(selected); event.target.value = ""; }} />
                <span className="inline-flex h-9 items-center rounded-xl border border-border bg-background px-4 text-sm font-medium">Browse files</span>
              </label>
            </div> : <div className="relative overflow-hidden rounded-2xl">
              <img src={preview} alt="Selected inspiration preview" className="w-full rounded-2xl object-cover" />
              <button type="button" onClick={clearUpload} aria-label="Remove selected image"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
            </div>}
            {fileError && <p role="alert" className="text-sm text-destructive">{fileError}</p>}
            {upload.error && <p role="alert" className="text-sm text-destructive">{upload.error.message} Your image is still selected; retry when ready.</p>}
            <Button className="w-full gap-2" onClick={() => upload.mutate()} loading={upload.isPending} disabled={!file || upload.isPending}>
              <ScanSearch className="h-4 w-4" />{upload.isPending ? "Uploading and analysing…" : "Analyse outfit"}
            </Button>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
            <p className="text-label-sm mb-3">Saved inspirations</p>
            {savedQuery.isPending ? <p role="status" className="text-sm text-muted-foreground">Loading inspirations…</p>
              : savedQuery.error ? <div className="space-y-2"><p role="alert" className="text-sm text-destructive">Could not load inspirations.</p><Button variant="outline" size="sm" onClick={() => void savedQuery.refetch()}>Retry</Button></div>
              : !savedQuery.data?.data.length ? <p className="text-sm text-muted-foreground">Your analysed images will appear here after you upload one.</p>
              : <>
                <div className="grid grid-cols-3 gap-2">
                  {savedQuery.data.data.map((saved) => <button key={saved.id} type="button" onClick={() => { clearUpload(); selectInspiration(saved.id); }}
                    aria-label={`Open ${saved.title ?? "saved inspiration"}`}
                    className={`group overflow-hidden rounded-xl border transition-colors ${selectedId === saved.id ? "border-brand" : "border-border/60 hover:border-brand/40"}`}>
                    <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                      <img src={inspirationApi.imageUrl(saved.id)} alt={saved.title ?? "Saved inspiration"} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    </div>
                    <span className="block truncate px-1 py-1 text-[10px]">{saved.title ?? "Inspiration"}</span>
                  </button>)}
                </div>
                {(savedQuery.data.meta.totalPages > 1) && <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
                  Page {page} of {savedQuery.data.meta.totalPages}
                  <Button size="sm" variant="ghost" disabled={page >= savedQuery.data.meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
                </div>}
              </>}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!selectedId ? <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex min-h-[500px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border bg-muted/20 p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted"><ScanSearch className="h-7 w-7 text-muted-foreground" /></div>
            <p className="text-display-sm">Upload a look to get started</p>
            <p className="max-w-xs text-sm text-muted-foreground">The server will describe visible clothing and compare those attributes with your wardrobe.</p>
          </motion.div> : detailQuery.isPending ? <div key="loading" role="status" className="rounded-3xl border border-border/60 bg-card p-8 text-sm text-muted-foreground">Loading saved inspiration…</div>
            : detailQuery.error || !detail || !analysis ? <EmptyState key="error" icon={<ScanSearch className="h-6 w-6" />} title="Inspiration unavailable"
              description={detailQuery.error?.message ?? "This analysis could not be loaded."} action={{ label: "Try again", onClick: () => void detailQuery.refetch() }} />
              : <motion.div key={detail.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-5">
                {analysis.provider === "mock" && <p role="status" className="rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">Development mock: these sample attributes were not inferred from the uploaded image. Configure a vision provider for real analysis.</p>}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
                    <div className="border-b border-border/50 px-5 py-4"><p className="text-label-sm">Original inspiration</p></div>
                    <div className="relative aspect-[3/4] overflow-hidden bg-muted"><img src={inspirationApi.imageUrl(detail.id)} alt="Saved outfit inspiration" className="h-full w-full object-cover" /></div>
                  </div>
                  <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
                    <div className="flex items-center justify-between border-b border-border/50 px-5 py-4"><p className="text-label-sm">Closest owned pieces</p><Badge variant="success">{analysis.recreationSuggestion.overallScore}% attribute match</Badge></div>
                    <div className="min-h-[280px] space-y-2.5 bg-gradient-to-br from-[#faf5ef] to-[#e8d5bc] p-5 dark:from-[#1a1410] dark:to-[#2e1f16]">
                      {analysis.matchedItems.length ? analysis.matchedItems.map((match, index) => <motion.div key={`${match.clothingItemId}-${index}`} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-3 rounded-2xl bg-background/70 px-4 py-3 backdrop-blur-sm">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                        <div className="min-w-0"><p className="truncate text-xs font-medium">{match.item?.name ?? match.itemName}</p><p className="text-[10px] text-muted-foreground">{match.available ? match.reason : "No longer in your wardrobe"}</p></div>
                        <Badge variant="accent" size="sm" className="ml-auto shrink-0">{match.score}%</Badge>
                      </motion.div>) : <p className="text-sm text-muted-foreground">No wardrobe items match the detected garment categories yet.</p>}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
                  <div className="mb-4 flex items-center justify-between"><p className="text-display-md">Approximate attribute match</p><span className="text-display-xl text-brand-dark">{analysis.recreationSuggestion.overallScore}%</span></div>
                  <Progress value={analysis.recreationSuggestion.overallScore} className="h-3" indicatorClassName="bg-brand" />
                  <p className="mt-3 text-sm text-muted-foreground">{analysis.recreationSuggestion.explanation} This compares recorded clothing attributes, not image embeddings or exact visual similarity.</p>
                  <p className="mt-2 text-xs text-muted-foreground">Detected style: {analysis.detectedStyle}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{[
                    ...analysis.colors.map((value) => `Color: ${value}`), ...analysis.patterns.map((value) => `Pattern: ${value}`),
                    ...analysis.silhouettes.map((value) => `Silhouette: ${value}`), ...analysis.layers.map((value) => `Layer: ${value}`),
                    ...analysis.accessories.map((value) => `Accessory: ${value}`), ...analysis.aesthetics.map((value) => `Aesthetic: ${value}`),
                  ].map((label) => <Badge key={label} variant="muted" size="sm">{label}</Badge>)}</div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {analysis.matchedItems.map((match) => <div key={match.clothingItemId} className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
                    <p className="text-label-sm mb-2">{match.category}</p>
                    {match.item ? <Link href={`/wardrobe/${match.item.id}`} className="mb-1 block text-sm font-semibold hover:text-brand-dark">{match.item.name}</Link>
                      : <p className="mb-1 text-sm font-semibold">{match.itemName} · removed</p>}
                    <p className="mb-3 text-xs text-muted-foreground">{match.available ? match.reason : "No longer in your wardrobe"}</p>
                    <div className="flex items-center justify-between"><Progress value={match.score} className="mr-3 h-1.5 flex-1" indicatorClassName="bg-brand" /><span className="shrink-0 text-xs font-medium text-brand-dark">{match.score}%</span></div>
                  </div>)}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
                    <p className="text-label-sm mb-4">Missing pieces</p>
                    {analysis.missingPieces.length ? <div className="space-y-3">{analysis.missingPieces.map((piece, index) => <div key={`${piece.category}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 px-4 py-3">
                      <div><p className="text-sm font-medium">{piece.description}</p><p className="text-xs text-muted-foreground">{piece.category} · {piece.reason}</p></div>
                    </div>)}</div> : <p className="text-sm text-muted-foreground">Every detected garment category has an available wardrobe piece.</p>}
                  </div>
                  <div className="space-y-3 rounded-3xl border border-border/60 bg-card p-6 shadow-card">
                    <p className="text-label-sm mb-4">Complete this look</p>
                    <Button className="w-full gap-2" asChild><Link href="/shopping"><ShoppingBag className="h-4 w-4" /> Browse shopping</Link></Button>
                    <Button variant="outline" className="w-full gap-2" disabled={analysis.recreationSuggestion.clothingItemIds.length < 2 || saveLook.isPending || savedLookId === detail.id}
                      loading={saveLook.isPending} onClick={() => saveLook.mutate()}><Sparkles className="h-4 w-4" /> {savedLookId === detail.id ? "Recreated look saved" : "Save recreated look"}</Button>
                    {savedLookId === detail.id && <Link href="/saved-outfits" className="block text-center text-sm text-brand-dark hover:underline">View saved outfits</Link>}
                    {saveLook.error && <p role="alert" className="text-sm text-destructive">{saveLook.error.message}</p>}
                    {analysis.recreationSuggestion.clothingItemIds.length < 2 && <p className="text-xs text-muted-foreground">At least two available wardrobe pieces are needed to save a recreated look.</p>}
                    <Button variant="ghost" className="w-full gap-2" onClick={() => { clearUpload(); selectInspiration(null); }}><ScanSearch className="h-4 w-4" /> Try another look</Button>
                    <Button variant="ghost" className="w-full gap-2 text-destructive" disabled={remove.isPending}
                      onClick={() => { if (window.confirm("Delete this saved inspiration and its image?")) remove.mutate(detail.id); }}><Trash2 className="h-4 w-4" /> Delete inspiration</Button>
                    {remove.error && <p role="alert" className="text-sm text-destructive">{remove.error.message}</p>}
                  </div>
                </div>
              </motion.div>}
        </AnimatePresence>
      </div>
    </DashboardShell>
  );
}
