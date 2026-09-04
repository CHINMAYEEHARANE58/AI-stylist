"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Lock, Palette, Shield, Trash2, User } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const SECTIONS = [
  { id: "account",       label: "Account",       icon: User    },
  { id: "notifications", label: "Notifications", icon: Bell    },
  { id: "appearance",    label: "Appearance",    icon: Palette },
  { id: "privacy",       label: "Privacy",       icon: Shield  },
];

const NOTIF_SETTINGS = [
  { id: "daily",   label: "Daily outfit suggestion",  desc: "AI picks an outfit every morning",     default: true  },
  { id: "weather", label: "Weather alerts",           desc: "Styling advice based on forecast",     default: true  },
  { id: "sale",    label: "Price drop alerts",        desc: "When wishlisted items go on sale",     default: true  },
  { id: "trend",   label: "Trend updates",            desc: "Weekly fashion trends matched to you", default: false },
  { id: "system",  label: "Product updates",          desc: "New features and improvements",        default: false },
];

const PRIVACY_SETTINGS = [
  { id: "p1", label: "Share anonymised style data to improve AI",   def: true  },
  { id: "p2", label: "Allow personalised shopping recommendations", def: true  },
  { id: "p3", label: "Enable usage analytics",                      def: false },
];

export default function SettingsPage() {
  const [active, setActive] = useState("account");

  const [notifs, setNotifs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_SETTINGS.map((n) => [n.id, n.default])),
  );

  const [privacy, setPrivacy] = useState<Record<string, boolean>>(
    Object.fromEntries(PRIVACY_SETTINGS.map((p) => [p.id, p.def])),
  );

  return (
    <DashboardShell heading="Settings" subheading="Manage your account, notifications, and preferences.">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Section nav */}
        <nav className="flex flex-row gap-1 overflow-x-auto no-scrollbar lg:flex-col lg:overflow-visible">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActive(id)}
              className={`flex flex-none items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm transition-colors ${
                active === id
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Panel */}
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl border border-border/60 bg-card p-6 shadow-card space-y-6"
        >
          {/* ── Account ── */}
          {active === "account" && (
            <>
              <div>
                <p className="text-label-sm mb-4">Personal information</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Full name"  defaultValue="Maya Kapoor" />
                  <Input label="Email"      defaultValue="maya@closetai.com" />
                  <Input label="Sizes"      defaultValue="XS–S tops · 26 bottoms" />
                  <Input label="Pronouns"   placeholder="she/her" />
                </div>
                <Button className="mt-5">Save changes</Button>
              </div>

              <Separator />

              <div>
                <p className="text-label-sm mb-4">Change password</p>
                <div className="grid max-w-md gap-4">
                  <Input type="password" label="Current password"     placeholder="••••••••" />
                  <Input type="password" label="New password"         placeholder="••••••••" />
                  <Input type="password" label="Confirm new password" placeholder="••••••••" />
                </div>
                <Button variant="outline" className="mt-5 gap-2">
                  <Lock className="h-4 w-4" /> Update password
                </Button>
              </div>

              <Separator />

              <div>
                <p className="text-label-sm mb-3">Connected accounts</p>
                <div className="flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-background text-xs font-bold">G</div>
                    <div>
                      <p className="text-sm font-medium">Google</p>
                      <p className="text-xs text-muted-foreground">maya@gmail.com</p>
                    </div>
                  </div>
                  <Badge variant="success" size="sm">Connected</Badge>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-label-sm text-destructive mb-2">Danger zone</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Permanently delete your account and all wardrobe data. This cannot be undone.
                </p>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="h-4 w-4" /> Delete account
                </Button>
              </div>
            </>
          )}

          {/* ── Notifications ── */}
          {active === "notifications" && (
            <div>
              <p className="text-label-sm mb-5">Notification preferences</p>
              <div className="space-y-0">
                {NOTIF_SETTINGS.map((n, i) => (
                  <div key={n.id}>
                    <div className="flex items-center justify-between gap-4 py-4">
                      <div>
                        <p className="text-sm font-medium">{n.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{n.desc}</p>
                      </div>
                      <Switch
                        checked={notifs[n.id]}
                        onCheckedChange={(v) => setNotifs((prev) => ({ ...prev, [n.id]: v }))}
                      />
                    </div>
                    {i < NOTIF_SETTINGS.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
              <Button className="mt-6">Save notification settings</Button>
            </div>
          )}

          {/* ── Appearance ── */}
          {active === "appearance" && (
            <div className="space-y-6">
              <div>
                <p className="text-label-sm mb-4">Theme</p>
                <div className="flex items-center gap-4 rounded-2xl bg-muted/60 px-4 py-3">
                  <p className="flex-1 text-sm">Toggle between light and dark mode</p>
                  <ThemeToggle />
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-label-sm mb-4">Language &amp; region</p>
                <div className="grid max-w-sm gap-4">
                  <Input label="Language"    defaultValue="English (US)" />
                  <Input label="Currency"    defaultValue="INR (₹)" />
                  <Input label="Date format" defaultValue="DD/MM/YYYY" />
                </div>
                <Button className="mt-5">Save preferences</Button>
              </div>
            </div>
          )}

          {/* ── Privacy ── */}
          {active === "privacy" && (
            <div className="space-y-6">
              <div>
                <p className="text-label-sm mb-4">Data &amp; privacy</p>
                <div className="space-y-2">
                  {PRIVACY_SETTINGS.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-3">
                      <p className="text-sm">{p.label}</p>
                      <Switch
                        checked={privacy[p.id]}
                        onCheckedChange={(v) => setPrivacy((prev) => ({ ...prev, [p.id]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-label-sm mb-2">Download your data</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Get a copy of all your wardrobe data, saved outfits, and style profile.
                </p>
                <Button variant="outline">Request data export</Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardShell>
  );
}
