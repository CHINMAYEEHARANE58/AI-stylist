"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, CheckCircle2, CloudUpload, ScanSearch,
  ShoppingBag, Sparkles, X,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { wardrobeItems } from "@/lib/mock-data";

const MATCHED_PIECES = [
  { type: "Top",        item: "Ivory Satin Blouse",    score: 94, match: "Visual silhouette match" },
  { type: "Bottom",     item: "Black Tailored Skirt",  score: 91, match: "Silhouette & colour" },
  { type: "Shoes",      item: "Cream Leather Sneakers",score: 76, match: "Style substitute" },
];

const MISSING_PIECES = [
  { name: "Soft beige trench coat",   budget: "₹6,000–10,000" },
  { name: "Structured leather tote",  budget: "₹4,000–8,000" },
];

export default function PinterestMatchPage() {
  const [dragOver, setDragOver] = useState(false);
  const [preview,  setPreview]  = useState<string | null>(null);
  const [analysed, setAnalysed] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [url,      setUrl]      = useState("");

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setPreview(URL.createObjectURL(file));
    analyse();
  }

  function analyse() {
    setLoading(true);
    setTimeout(() => { setLoading(false); setAnalysed(true); }, 1600);
  }

  return (
    <DashboardShell
      heading="Pinterest Match Studio"
      subheading="Upload any outfit inspiration and AI recreates it with your existing wardrobe."
    >
      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        {/* ── Upload panel ── */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card space-y-4">
            <p className="text-label-sm">Upload inspiration</p>

            {/* URL input */}
            <div className="flex gap-2">
              <Input
                placeholder="Paste Pinterest board URL…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" size="icon" onClick={analyse} aria-label="Analyse URL">
                <ScanSearch className="h-4 w-4" />
              </Button>
            </div>

            {/* Drop zone */}
            {!preview ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault(); setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer
                  ${dragOver ? "border-brand bg-brand/5" : "border-border hover:border-brand/40 hover:bg-muted/30"}`}
              >
                <CloudUpload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Drop outfit screenshot here</p>
                <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                  <Button variant="outline" size="sm" className="pointer-events-none">Browse files</Button>
                </label>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl">
                <img src={preview} alt="Inspiration" className="w-full object-cover rounded-2xl" />
                <button
                  type="button"
                  onClick={() => { setPreview(null); setAnalysed(false); }}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 backdrop-blur text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <Button className="w-full gap-2" onClick={analyse} loading={loading} disabled={!preview && !url}>
              <ScanSearch className="h-4 w-4" />
              {loading ? "Analysing…" : "Analyse outfit"}
            </Button>
          </div>

          {/* Demo inspirations */}
          <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
            <p className="text-label-sm mb-3">Try a demo look</p>
            <div className="grid grid-cols-3 gap-2">
              {wardrobeItems.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setPreview(item.image); analyse(); }}
                  className="group overflow-hidden rounded-xl border border-border/60 hover:border-brand/40 transition-colors"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                    <Image src={item.image} alt={item.name} fill className="object-cover transition-transform group-hover:scale-105 duration-300" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Results ── */}
        <AnimatePresence mode="wait">
          {!analysed ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[500px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border bg-muted/20 p-12 text-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <ScanSearch className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-display-sm">Upload a look to get started</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                AI will match it to your wardrobe and show how close you can get.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-5"
            >
              {/* Side-by-side comparison */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Original */}
                <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
                  <div className="border-b border-border/50 px-5 py-4">
                    <p className="text-label-sm">Original inspiration</p>
                  </div>
                  <div className="relative aspect-[3/4] bg-muted overflow-hidden">
                    {preview ? (
                      <img src={preview} alt="Inspiration" className="w-full h-full object-cover" />
                    ) : (
                      <Image src={wardrobeItems[0].image} alt="Demo" fill className="object-cover" />
                    )}
                  </div>
                </div>

                {/* Recreated */}
                <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
                  <div className="border-b border-border/50 px-5 py-4 flex items-center justify-between">
                    <p className="text-label-sm">Recreated from your wardrobe</p>
                    <Badge variant="success">87% match</Badge>
                  </div>
                  <div className="p-5 space-y-2.5 bg-gradient-to-br from-[#faf5ef] to-[#e8d5bc] dark:from-[#1a1410] dark:to-[#2e1f16] min-h-[280px]">
                    {MATCHED_PIECES.map((p, i) => (
                      <motion.div
                        key={p.type}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-3 rounded-2xl bg-background/70 px-4 py-3 backdrop-blur-sm"
                      >
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{p.item}</p>
                          <p className="text-[10px] text-muted-foreground">{p.match}</p>
                        </div>
                        <Badge variant="accent" size="sm" className="ml-auto shrink-0">{p.score}%</Badge>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Similarity score */}
              <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-display-md">Overall similarity</p>
                  <span className="text-display-xl text-brand-dark">87%</span>
                </div>
                <Progress value={87} className="h-3" indicatorClassName="bg-brand" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Your satin blouse, black skirt, and cream sneakers create the closest match available in your wardrobe.
                </p>
              </div>

              {/* Matched pieces detail */}
              <div className="grid gap-4 sm:grid-cols-3">
                {MATCHED_PIECES.map((p) => (
                  <div key={p.type} className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
                    <p className="text-label-sm mb-2">{p.type}</p>
                    <p className="font-semibold text-sm mb-1">{p.item}</p>
                    <p className="text-xs text-muted-foreground mb-3">{p.match}</p>
                    <div className="flex items-center justify-between">
                      <Progress value={p.score} className="h-1.5 flex-1 mr-3" indicatorClassName="bg-brand" />
                      <span className="text-xs font-medium text-brand-dark shrink-0">{p.score}%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Missing pieces */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
                  <p className="text-label-sm mb-4">Missing pieces</p>
                  <div className="space-y-3">
                    {MISSING_PIECES.map((p) => (
                      <div key={p.name} className="rounded-2xl bg-muted/60 px-4 py-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{p.name}</p>
                        <span className="text-xs text-muted-foreground shrink-0">{p.budget}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card space-y-3">
                  <p className="text-label-sm mb-4">Complete this look</p>
                  <Button className="w-full gap-2" asChild>
                    <Link href="/shopping">
                      <ShoppingBag className="h-4 w-4" /> Shop missing pieces
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full gap-2">
                    <Sparkles className="h-4 w-4" /> Save recreated look
                  </Button>
                  <Button variant="ghost" className="w-full gap-2" onClick={() => { setPreview(null); setAnalysed(false); }}>
                    <ScanSearch className="h-4 w-4" /> Try another look
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardShell>
  );
}
