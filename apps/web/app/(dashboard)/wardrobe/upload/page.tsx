"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Camera, CheckCircle2, CloudUpload, Sparkles, Tag, X } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FilterChips } from "@/components/ui/filter-chips";

const CATEGORIES = ["Tops","Shirts","Blazers","Jeans","Trousers","Skirts","Dresses","Shoes","Accessories","Outerwear"];
const SEASONS    = ["Spring","Summer","Autumn","Winter","All season"];
const OCCASIONS  = ["Office","Casual","Party","Brunch","Travel","Date night","Vacation","Wedding"];
const STYLES     = ["Minimal","Classic","Elegant","Casual","Streetwear","Quiet luxury","Old money","Romantic"];

type Step = "upload" | "details" | "review";

export default function UploadClothesPage() {
  const [step, setStep]           = useState<Step>("upload");
  const [dragging, setDragging]   = useState(false);
  const [preview, setPreview]     = useState<string | null>(null);
  const [aiTags] = useState(["Ivory", "Satin", "Tops", "Elegant", "All season"]);
  const [name, setName]           = useState("");
  const [brand, setBrand]         = useState("");
  const [selectedCats, setCats]   = useState<string[]>([]);
  const [selectedSeasons, setSeasons] = useState<string[]>([]);
  const [selectedOccasions, setOccasions] = useState<string[]>([]);
  const [selectedStyles, setStyles] = useState<string[]>([]);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    // Simulate AI tagging delay
    setTimeout(() => setStep("details"), 800);
  }

  return (
    <DashboardShell heading="Add to Wardrobe" subheading="Upload a photo and AI will tag it automatically.">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(["upload", "details", "review"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors
              ${step === s ? "bg-primary text-primary-foreground" : 
                (["upload","details","review"].indexOf(step) > i) ? "bg-success text-white" : "bg-muted text-muted-foreground"}`}>
              {["upload","details","review"].indexOf(step) > i ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`hidden text-xs sm:block ${step === s ? "font-medium text-foreground" : "text-muted-foreground"}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < 2 && <div className="h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Left: upload / preview */}
        <div>
          {!preview ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              className={`flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed p-12 text-center transition-colors cursor-pointer
                ${dragging ? "border-brand bg-brand/5" : "border-border hover:border-brand/50 hover:bg-muted/30"}`}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <CloudUpload className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="text-display-sm mb-1">Drop your photo here</p>
                <p className="text-sm text-muted-foreground">PNG, JPG, WEBP up to 10MB</p>
              </div>
              <div className="flex gap-3">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  <Button variant="outline" className="pointer-events-none">Browse files</Button>
                </label>
                <Button variant="muted">
                  <Camera className="h-4 w-4" /> Use camera
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card">
              <img src={preview} alt="Upload preview" className="w-full object-cover" />
              <button
                type="button"
                onClick={() => { setPreview(null); setStep("upload"); }}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              {/* AI tag overlay */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-brand" />
                  <span className="text-xs font-medium text-white">AI detected</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {aiTags.map((t) => (
                    <span key={t} className="rounded-full bg-white/20 backdrop-blur px-2.5 py-1 text-[11px] text-white">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: details form */}
        <AnimatePresence>
          {step !== "upload" && (
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-5"
            >
              <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card space-y-5">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-brand" />
                  <p className="text-sm font-medium">Item details</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Item name" placeholder="e.g. Ivory Satin Blouse" value={name} onChange={(e) => setName(e.target.value)} />
                  <Input label="Brand" placeholder="e.g. Zara, COS, Thrift" value={brand} onChange={(e) => setBrand(e.target.value)} />
                  <Input label="Colour" placeholder="Auto-detected: Ivory" />
                  <Input label="Fabric" placeholder="e.g. Satin, Cotton, Linen" />
                </div>

                <div>
                  <p className="text-label-xs mb-2">Category</p>
                  <FilterChips options={CATEGORIES} selected={selectedCats} onChange={setCats} multi={false} />
                </div>
                <div>
                  <p className="text-label-xs mb-2">Season</p>
                  <FilterChips options={SEASONS} selected={selectedSeasons} onChange={setSeasons} />
                </div>
                <div>
                  <p className="text-label-xs mb-2">Occasion</p>
                  <FilterChips options={OCCASIONS} selected={selectedOccasions} onChange={setOccasions} />
                </div>
                <div>
                  <p className="text-label-xs mb-2">Style</p>
                  <FilterChips options={STYLES} selected={selectedStyles} onChange={setStyles} />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("upload")} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button className="flex-1 gap-2" onClick={() => setStep("review")}>
                  <Sparkles className="h-4 w-4" />
                  {step === "details" ? "Review item" : "Add to wardrobe"}
                </Button>
              </div>

              {step === "review" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl border border-success/30 bg-success/5 p-5 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-success mb-3" />
                  <p className="font-medium text-success">Item added to your wardrobe!</p>
                  <div className="mt-4 flex gap-3 justify-center">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/wardrobe">View wardrobe</Link>
                    </Button>
                    <Button size="sm" onClick={() => { setStep("upload"); setPreview(null); setName(""); setBrand(""); }}>
                      Add another
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardShell>
  );
}
