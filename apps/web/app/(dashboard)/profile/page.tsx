"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Edit3, Palette, Sparkles, Star, Trophy } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterChips } from "@/components/ui/filter-chips";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { ApiError, authApi, profileApi, type UserProfileApi } from "@/lib/api-client";
import { profileAesthetics } from "@/lib/mock-data";
import { useAppStore } from "@/store/app-store";

const ACHIEVEMENTS = [
  { title: "First Upload", desc: "Added your first wardrobe item", done: true },
  { title: "Style Explorer", desc: "Generated 10 AI outfits", done: true },
  { title: "Pinterest Pro", desc: "Matched 5 Pinterest inspirations", done: false },
  { title: "Wardrobe Analyst", desc: "Reviewed your full insights report", done: true },
  { title: "Shopping Savvy", desc: "Compared prices across 3 retailers", done: false },
  { title: "Outfit Curator", desc: "Saved 10 outfits to your collection", done: false },
];

const displayName = (profile: UserProfileApi["profile"] | undefined, fallback = "Your profile") =>
  [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || fallback;
const messageFor = (error: unknown) => error instanceof ApiError ? error.message : "We couldn't save your changes. Please try again.";

export default function ProfilePage() {
  const { user, setUser } = useAppStore();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<UserProfileApi | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(user?.name ?? "");
  const [sizes, setSizes] = useState("");
  const [aesthetics, setAesthetics] = useState<string[]>([]);

  const applyProfile = (next: UserProfileApi) => {
    setData(next);
    setName(displayName(next.profile, user?.name ?? ""));
    setSizes(next.profile?.clothingSizes?.general ?? "");
    setAesthetics(next.preferences?.preferredAesthetics ?? []);
  };
  const refresh = async () => applyProfile((await profileApi.get()).data);
  const syncUser = async () => setUser((await authApi.me()).data.user);

  useEffect(() => {
    let mounted = true;
    profileApi.get().then((response) => mounted && applyProfile(response.data)).catch((error) => mounted && toast(messageFor(error), "error")).finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [toast, user?.name]);

  const save = async () => {
    const normalizedName = name.trim();
    if (!normalizedName) return toast("Enter your name before saving.", "error");
    const [firstName, ...lastName] = normalizedName.split(/\s+/);
    setSaving(true);
    try {
      await Promise.all([
        profileApi.updateProfile({ firstName, lastName: lastName.join(" "), clothingSizes: sizes.trim() ? { general: sizes.trim() } : {} }),
        profileApi.updatePreferences({ preferredAesthetics: aesthetics }),
      ]);
      await Promise.all([refresh(), syncUser()]);
      setEditing(false);
      toast("Your style profile has been saved.", "success");
    } catch (error) { toast(messageFor(error), "error"); } finally { setSaving(false); }
  };
  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const imageFile = event.target.files?.[0];
    if (!imageFile) return;
    setSaving(true);
    try {
      await profileApi.updateProfile({ imageFile });
      await Promise.all([refresh(), syncUser()]);
      toast("Your profile photo has been updated.", "success");
    } catch (error) { toast(messageFor(error), "error"); }
    finally { setSaving(false); event.target.value = ""; }
  };

  const initials = displayName(data?.profile, user?.name ?? "U").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const colors = data?.preferences?.favoriteColors ?? [];
  const stats = data?.stats ?? { wardrobeItems: 0, outfitsGenerated: 0, savedOutfits: 0 };

  return <DashboardShell heading="Style Profile" subheading="Your personal style fingerprint — the more you add, the smarter ClosetAI gets.">
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card"><div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="relative shrink-0"><Avatar size="xl">{data?.profile?.imageUrl && <AvatarImage src={data.profile.imageUrl} alt="Profile photo" />}<AvatarFallback className="text-2xl font-display">{initials}</AvatarFallback></Avatar><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={uploadAvatar} /><button type="button" disabled={saving} onClick={() => fileInput.current?.click()} className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60" aria-label="Edit avatar"><Edit3 className="h-3.5 w-3.5" /></button></div>
        <div className="flex-1 min-w-0"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-display-md">{loading ? "Loading…" : displayName(data?.profile, user?.name ?? "Your profile")}</h2><p className="text-sm text-muted-foreground mt-0.5">{data?.email ?? user?.email}</p><div className="mt-2 flex flex-wrap gap-1.5">{aesthetics.map((item) => <Badge key={item} variant="accent" size="sm">{item}</Badge>)}</div></div><Button variant={editing ? "default" : "outline"} size="sm" className="gap-2" onClick={() => editing ? save() : setEditing(true)} disabled={saving || loading}><Edit3 className="h-3.5 w-3.5" />{saving ? "Saving…" : editing ? "Save profile" : "Edit profile"}</Button></div><div className="mt-4 grid grid-cols-3 gap-3">{[[stats.wardrobeItems, "Items"], [stats.outfitsGenerated, "Outfits"], [stats.savedOutfits, "Saved looks"]].map(([value, label]) => <div key={String(label)} className="rounded-2xl bg-muted/60 p-3 text-center"><p className="text-display-sm">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</div></div>
      </div></div>
      <Tabs defaultValue="dna"><TabsList className="w-full sm:w-auto"><TabsTrigger value="dna">Style DNA</TabsTrigger><TabsTrigger value="preferences">Preferences</TabsTrigger><TabsTrigger value="achievements">Achievements</TabsTrigger></TabsList>
        <TabsContent value="dna" className="space-y-5"><div className="grid gap-5 lg:grid-cols-2"><div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card"><div className="flex items-center gap-2 mb-5"><Palette className="h-4 w-4 text-brand" /><p className="text-label-sm">Colour signature</p></div><div className="space-y-4">{colors.length ? colors.map((color) => <div key={color}><div className="mb-1.5 flex justify-between text-sm"><span>{color}</span><span className="text-muted-foreground">{Math.round(100 / colors.length)}%</span></div><Progress value={Math.round(100 / colors.length)} className="h-2" indicatorClassName="bg-brand" /></div>) : <p className="text-sm text-muted-foreground">Add favourite colours in Settings to build your signature.</p>}</div></div><div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card"><div className="flex items-center gap-2 mb-5"><Sparkles className="h-4 w-4 text-brand" /><p className="text-label-sm">Fashion fingerprint</p></div><div className="grid gap-3">{[["Aesthetics", aesthetics.join(", ") || "Not set"], ["Colours", colors.join(", ") || "Not set"], ["Style preferences", data?.preferences?.stylePreferences.join(", ") || "Not set"], ["Sizes", sizes || "Not set"]].map(([label, value]) => <div key={label} className="rounded-2xl bg-muted/60 p-4"><p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p><p className="text-sm">{value}</p></div>)}</div></div></div></TabsContent>
        <TabsContent value="preferences" className="space-y-5"><div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card space-y-5"><p className="text-label-sm">Personal details</p><div className="grid gap-4 sm:grid-cols-2"><Input label="Full name" value={name} onChange={(event) => setName(event.target.value)} disabled={!editing || saving} /><Input label="Email" value={data?.email ?? user?.email ?? ""} disabled /><Input label="Sizes" value={sizes} onChange={(event) => setSizes(event.target.value)} disabled={!editing || saving} /><Input label="Profile photo" value={data?.profile?.imageUrl ? "Photo uploaded" : "No photo uploaded"} disabled /></div><div><p className="text-label-xs mb-3">Style aesthetics</p><FilterChips options={profileAesthetics} selected={aesthetics} onChange={editing ? setAesthetics : () => {}} /></div>{editing && <Button className="w-full" onClick={save} disabled={saving}><CheckCircle2 className="h-4 w-4" />{saving ? "Saving…" : "Save preferences"}</Button>}</div></TabsContent>
        <TabsContent value="achievements" className="space-y-4"><div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card"><div className="flex items-center gap-2 mb-5"><Trophy className="h-4 w-4 text-brand" /><p className="text-label-sm">Achievements</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{ACHIEVEMENTS.map((achievement) => <motion.div key={achievement.title} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className={`rounded-2xl p-4 transition-colors ${achievement.done ? "bg-success/8 border border-success/20" : "bg-muted/60"}`}><div className="flex items-start gap-3"><div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${achievement.done ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>{achievement.done ? <Star className="h-4 w-4 fill-current" /> : <Star className="h-4 w-4" />}</div><div><p className={`text-sm font-semibold ${achievement.done ? "text-foreground" : "text-muted-foreground"}`}>{achievement.title}</p><p className="text-xs leading-5 text-muted-foreground mt-0.5">{achievement.desc}</p>{achievement.done && <Badge variant="success" size="sm" className="mt-2">Earned</Badge>}</div></div></motion.div>)}</div></div></TabsContent>
      </Tabs>
    </motion.div>
  </DashboardShell>;
}
