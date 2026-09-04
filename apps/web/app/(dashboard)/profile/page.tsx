"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Edit3, Palette, Shirt, Sparkles, Star, Trophy } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FilterChips } from "@/components/ui/filter-chips";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { analytics, profileAesthetics, outfitSuggestions } from "@/lib/mock-data";
import { useAppStore } from "@/store/app-store";

const ACHIEVEMENTS = [
  { title: "First Upload",      desc: "Added your first wardrobe item",       done: true  },
  { title: "Style Explorer",    desc: "Generated 10 AI outfits",               done: true  },
  { title: "Pinterest Pro",     desc: "Matched 5 Pinterest inspirations",      done: false },
  { title: "Wardrobe Analyst",  desc: "Reviewed your full insights report",    done: true  },
  { title: "Shopping Savvy",    desc: "Compared prices across 3 retailers",    done: false },
  { title: "Outfit Curator",    desc: "Saved 10 outfits to your collection",   done: false },
];

export default function ProfilePage() {
  const { user } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [selectedAesthetics, setAesthetics] = useState(["Quiet luxury", "Minimal chic"]);
  const [name, setName]   = useState(user?.name ?? "Maya Kapoor");
  const [sizes, setSizes] = useState("XS–S tops · 26 bottoms · 38 shoes");

  return (
    <DashboardShell
      heading="Style Profile"
      subheading="Your personal style fingerprint — the more you add, the smarter ClosetAI gets."
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* ── Profile header ── */}
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="relative shrink-0">
              <Avatar size="xl">
                <AvatarFallback className="text-2xl font-display">MK</AvatarFallback>
              </Avatar>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                aria-label="Edit avatar"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-display-md">{name}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{user?.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedAesthetics.map((a) => (
                      <Badge key={a} variant="accent" size="sm">{a}</Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant={editing ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setEditing((v) => !v)}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  {editing ? "Save profile" : "Edit profile"}
                </Button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  ["8", "Items"],
                  ["24", "Outfits"],
                  ["3", "Saved looks"],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-2xl bg-muted/60 p-3 text-center">
                    <p className="text-display-sm">{v}</p>
                    <p className="text-xs text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="dna">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="dna">Style DNA</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>

          {/* ── Style DNA ── */}
          <TabsContent value="dna" className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
                <div className="flex items-center gap-2 mb-5">
                  <Palette className="h-4 w-4 text-brand" />
                  <p className="text-label-sm">Colour signature</p>
                </div>
                <div className="space-y-4">
                  {analytics.favoriteColors.map((c) => (
                    <div key={c.label}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span>{c.label}</span>
                        <span className="text-muted-foreground">{c.value}%</span>
                      </div>
                      <Progress value={c.value} className="h-2" indicatorClassName="bg-brand" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
                <div className="flex items-center gap-2 mb-5">
                  <Sparkles className="h-4 w-4 text-brand" />
                  <p className="text-label-sm">Fashion fingerprint</p>
                </div>
                <div className="grid gap-3">
                  {[
                    ["Aesthetics",      "Quiet luxury, minimal chic, street polish"],
                    ["Colours",         "Ivory, black, camel, denim blue, gold"],
                    ["Personality",     "Polished, practical, neutral-forward"],
                    ["Fashion habits",  "Office repeats, brunch saves, weather-led"],
                  ].map(([label, value]) => (
                    <div key={label as string} className="rounded-2xl bg-muted/60 p-4">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
                      <p className="text-sm">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Preferences ── */}
          <TabsContent value="preferences" className="space-y-5">
            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card space-y-5">
              <p className="text-label-sm">Personal details</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} disabled={!editing} />
                <Input label="Email" value={user?.email ?? ""} disabled />
                <Input label="Sizes" value={sizes} onChange={(e) => setSizes(e.target.value)} disabled={!editing} />
                <Input label="Pronouns" placeholder="e.g. she/her, they/them" disabled={!editing} />
                <Input label="Style personality" defaultValue="Polished minimalist" disabled={!editing} className="sm:col-span-2" />
                <Input label="Fashion habits" defaultValue="Office, brunch, travel" disabled={!editing} className="sm:col-span-2" />
              </div>
              <div>
                <p className="text-label-xs mb-3">Style aesthetics</p>
                <FilterChips
                  options={profileAesthetics}
                  selected={selectedAesthetics}
                  onChange={editing ? setAesthetics : () => {}}
                />
              </div>
              {editing && (
                <Button className="w-full" onClick={() => setEditing(false)}>
                  <CheckCircle2 className="h-4 w-4" /> Save preferences
                </Button>
              )}
            </div>
          </TabsContent>

          {/* ── Achievements ── */}
          <TabsContent value="achievements" className="space-y-4">
            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
              <div className="flex items-center gap-2 mb-5">
                <Trophy className="h-4 w-4 text-brand" />
                <p className="text-label-sm">Achievements</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ACHIEVEMENTS.map((a) => (
                  <motion.div
                    key={a.title}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`rounded-2xl p-4 transition-colors ${
                      a.done ? "bg-success/8 border border-success/20" : "bg-muted/60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${
                        a.done ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                      }`}>
                        {a.done ? <Star className="h-4 w-4 fill-current" /> : <Star className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${a.done ? "text-foreground" : "text-muted-foreground"}`}>{a.title}</p>
                        <p className="text-xs leading-5 text-muted-foreground mt-0.5">{a.desc}</p>
                        {a.done && <Badge variant="success" size="sm" className="mt-2">Earned</Badge>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </DashboardShell>
  );
}
