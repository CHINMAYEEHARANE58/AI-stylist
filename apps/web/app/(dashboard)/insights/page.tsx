"use client";

import { motion } from "framer-motion";
import { BarChart3, Layers, Palette, Sparkles, TrendingUp } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { analytics, trendInsights, wardrobeGaps } from "@/lib/mock-data";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item    = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const BAR_COLORS = ["bg-brand", "bg-brand-dark", "bg-[#c8a070]", "bg-[#b88c58]"];

export default function InsightsPage() {
  return (
    <DashboardShell
      heading="Fashion Insights"
      subheading="A live breakdown of your wardrobe language, usage patterns, and style evolution."
    >
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

        {/* ── Top stats row ── */}
        <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Wardrobe items",    value: "8",    icon: Layers,   sub: "+2 this month" },
            { label: "Outfits generated", value: "24",   icon: Sparkles, sub: "Last 30 days" },
            { label: "Top aesthetic",     value: "Quiet luxury", icon: Palette, sub: "78% of looks" },
            { label: "Most-worn",         value: "Tops", icon: BarChart3, sub: "38% of all outfits" },
          ].map(({ label, value, icon: Icon, sub }) => (
            <div key={label} className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
              <Icon className="h-5 w-5 text-brand mb-3" />
              <p className="text-display-md leading-tight">{value}</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>
            </div>
          ))}
        </motion.div>

        {/* ── Colour palette + aesthetics ── */}
        <motion.div variants={item} className="grid gap-5 lg:grid-cols-2">
          {/* Favourite colours */}
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-5">
              <Palette className="h-4 w-4 text-brand" />
              <p className="text-label-sm">Colour palette</p>
            </div>
            <p className="text-display-md mb-6">Your favourite colours</p>
            <div className="space-y-4">
              {analytics.favoriteColors.map((c, i) => (
                <div key={c.label}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium">{c.label}</span>
                    <span className="text-muted-foreground">{c.value}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${c.value}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, delay: i * 0.08 }}
                      className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dominant aesthetics */}
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="h-4 w-4 text-brand" />
              <p className="text-label-sm">Aesthetic breakdown</p>
            </div>
            <p className="text-display-md mb-6">Dominant aesthetics</p>
            <div className="space-y-4">
              {analytics.aesthetics.map((a, i) => (
                <div key={a.label}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium">{a.label}</span>
                    <span className="text-muted-foreground">{a.value}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${a.value}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, delay: i * 0.1 }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Category usage + outfit history ── */}
        <motion.div variants={item} className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="h-4 w-4 text-brand" />
            <p className="text-label-sm">Usage analytics</p>
          </div>
          <p className="text-display-md mb-6">How you use your wardrobe</p>
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Categories */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">By category</p>
              <div className="space-y-4">
                {analytics.categories.map((c, i) => (
                  <div key={c.label}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span>{c.label}</span>
                      <span className="text-muted-foreground">{c.value}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${c.value}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: i * 0.07 }}
                        className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Outfit history */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">By occasion</p>
              <div className="space-y-3">
                {analytics.usageHistory.map((u) => (
                  <div key={u.label} className="flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-3 text-sm">
                    <span className="font-medium">{u.label}</span>
                    <div className="flex items-center gap-3">
                      <Progress value={u.value} className="h-1.5 w-20" indicatorClassName="bg-brand" />
                      <span className="text-xs text-muted-foreground w-8 text-right">{u.value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Behavioural insights ── */}
        <motion.div variants={item} className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
          <p className="text-label-sm mb-1">AI observations</p>
          <p className="text-display-md mb-5">Wardrobe behaviour patterns</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {analytics.habits.map((habit) => (
              <div key={habit} className="flex items-start gap-3 rounded-2xl bg-muted/60 p-4">
                <Sparkles className="h-4 w-4 text-brand mt-0.5 shrink-0" />
                <p className="text-sm leading-6 text-muted-foreground">{habit}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Trends ── */}
        <motion.div variants={item} className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="h-4 w-4 text-brand" />
            <p className="text-label-sm">Market trends</p>
          </div>
          <p className="text-display-md mb-5">Trends matching your style</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {trendInsights.map((t) => (
              <div key={t.title} className="rounded-2xl bg-muted/60 p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold">{t.title}</p>
                  {t.matchScore && (
                    <Badge variant="accent" size="sm">{t.matchScore}% match</Badge>
                  )}
                </div>
                <p className="text-xs leading-5 text-muted-foreground">{t.detail}</p>
              </div>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </DashboardShell>
  );
}
