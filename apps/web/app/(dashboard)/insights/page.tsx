"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Layers, Palette, Sparkles, TrendingUp } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { insightsApi } from "@/lib/api-client";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const BAR_COLORS = ["bg-brand", "bg-brand-dark", "bg-[#c8a070]", "bg-[#b88c58]"];

function Distribution({ rows, empty }: { rows: Array<{ label: string; value: number }>; empty: string }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return <div className="space-y-4">{rows.map((row, index) => {
    const percent = total ? Math.round(row.value * 100 / total) : 0;
    return <div key={row.label}><div className="mb-1.5 flex justify-between text-sm"><span>{row.label}</span><span className="text-muted-foreground">{row.value} · {percent}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-muted"><motion.div initial={{ width: 0 }} whileInView={{ width: `${percent}%` }} viewport={{ once: true }} transition={{ duration: 0.7, delay: index * 0.08 }} className={`h-full rounded-full ${BAR_COLORS[index % BAR_COLORS.length]}`} /></div></div>;
  })}</div>;
}

export default function InsightsPage() {
  const query = useQuery({ queryKey: ["fashion-insights"], queryFn: () => insightsApi.wardrobe(), staleTime: 30_000 });
  const data = query.data?.data;
  const topAesthetic = data?.aesthetics[0]?.label ?? "Not available";
  const mostUsed = data?.outfitUsageCategories[0]?.label ?? "No saved outfit usage";
  return <DashboardShell heading="Fashion Insights" subheading="Computed from your wardrobe and saved outfit history — not an invented activity feed.">
    {query.isLoading && <div role="status" className="rounded-3xl border border-border/60 bg-card p-8 text-sm text-muted-foreground">Calculating your insights…</div>}
    {query.isError && <div role="alert" className="rounded-3xl border border-destructive/20 bg-card p-8"><p className="text-sm text-destructive">{query.error.message}</p><Button variant="outline" onClick={() => void query.refetch()} className="mt-4">Retry</Button></div>}
    {data && <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {data.sampled && <p className="text-xs text-muted-foreground">Distributions use the 2,000 most recently added items; totals are exact.</p>}
      <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Wardrobe items", value: data.summary.totalItems, icon: Layers, sub: "Current, unarchived items" },
          { label: "Generation runs", value: data.summary.outfitsGenerated, icon: Sparkles, sub: "Recorded generation requests" },
          { label: "Top aesthetic", value: topAesthetic, icon: Palette, sub: "From wardrobe item tags" },
          { label: "Most-used category", value: mostUsed, icon: BarChart3, sub: "From saved outfit items" },
        ].map(({ label, value, icon: Icon, sub }) => <div key={label} className="rounded-3xl border border-border/60 bg-card p-5 shadow-card"><Icon className="h-5 w-5 text-brand mb-3" /><p className="text-display-md leading-tight">{value}</p><p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p></div>)}
      </motion.div>
      <motion.div variants={item} className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card"><div className="flex items-center gap-2 mb-5"><Palette className="h-4 w-4 text-brand" /><p className="text-label-sm">Colour palette</p></div><p className="text-display-md mb-6">Wardrobe colours</p><Distribution rows={data.colors} empty="Add wardrobe items to see your colours." /></div>
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card"><div className="flex items-center gap-2 mb-5"><Sparkles className="h-4 w-4 text-brand" /><p className="text-label-sm">Aesthetic breakdown</p></div><p className="text-display-md mb-6">Item style tags</p><Distribution rows={data.aesthetics} empty="Add aesthetic tags to your wardrobe items to see a breakdown." /></div>
      </motion.div>
      <motion.div variants={item} className="rounded-3xl border border-border/60 bg-card p-6 shadow-card"><div className="flex items-center gap-2 mb-5"><BarChart3 className="h-4 w-4 text-brand" /><p className="text-label-sm">Usage analytics</p></div><p className="text-display-md mb-6">How you use your wardrobe</p><div className="grid gap-8 lg:grid-cols-2"><div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">By saved outfit category</p><Distribution rows={data.outfitUsageCategories} empty="Save an outfit to see category usage." /></div><div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Saved outfit occasions</p><div className="space-y-3">{data.outfitOccasions.length ? data.outfitOccasions.map((occasion) => <div key={occasion.label ?? "Unspecified"} className="flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-3 text-sm"><span>{occasion.label ?? "Unspecified"}</span><span className="text-xs text-muted-foreground">{occasion.value} outfits</span></div>) : <p className="text-sm text-muted-foreground">No saved outfit occasions recorded yet.</p>}</div></div></div></motion.div>
      <motion.div variants={item} className="rounded-3xl border border-border/60 bg-card p-6 shadow-card"><p className="text-label-sm mb-1">Outfit history</p><p className="text-display-md mb-5">Recently saved looks</p><div className="grid gap-3 sm:grid-cols-2">{data.recentSavedOutfits.length ? data.recentSavedOutfits.map((saved) => <div key={saved.id} className="rounded-2xl bg-muted/60 p-4"><p className="text-sm font-semibold">{saved.outfit.title}</p><p className="mt-1 text-xs text-muted-foreground">{saved.outfit.occasion ?? "Any occasion"} · Saved {new Date(saved.createdAt).toLocaleDateString()}</p></div>) : <p className="text-sm text-muted-foreground">No saved outfit history yet.</p>}</div></motion.div>
      <motion.div variants={item} className="rounded-3xl border border-border/60 bg-card p-6 shadow-card"><p className="text-label-sm mb-1">Computed wardrobe gaps</p><p className="text-display-md mb-5">Categories with fewer than two items</p><div className="grid gap-3 sm:grid-cols-2">{data.wardrobeGaps.length ? data.wardrobeGaps.map((gap) => <div key={gap.title} className="rounded-2xl bg-muted/60 p-4"><p className="text-sm font-semibold">{gap.title} · {gap.priority}</p><p className="mt-1 text-xs text-muted-foreground">{gap.reason}</p></div>) : <p className="text-sm text-muted-foreground">No category gaps detected by this simple rule.</p>}</div></motion.div>
      <motion.div variants={item} className="rounded-3xl border border-border/60 bg-card p-6 shadow-card"><div className="flex items-center gap-2 mb-5"><TrendingUp className="h-4 w-4 text-brand" /><p className="text-label-sm">Market trends</p></div><p className="text-sm text-muted-foreground">No verified market-trend feed is configured. We do not show invented trend scores.</p></motion.div>
    </motion.div>}
  </DashboardShell>;
}
