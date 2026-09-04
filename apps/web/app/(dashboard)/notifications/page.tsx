"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, CloudSun, ShoppingBag, Sparkles, TrendingUp, X } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterChips } from "@/components/ui/filter-chips";
import { notifications } from "@/lib/mock-data";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_ICONS = {
  outfit:  <Sparkles className="h-4 w-4" />,
  weather: <CloudSun className="h-4 w-4" />,
  sale:    <ShoppingBag className="h-4 w-4" />,
  trend:   <TrendingUp className="h-4 w-4" />,
  system:  <Bell className="h-4 w-4" />,
};

const TYPE_COLORS: Record<Notification["type"], string> = {
  outfit:  "bg-brand/10 text-brand-dark",
  weather: "bg-blue-500/10 text-blue-600",
  sale:    "bg-success/10 text-success",
  trend:   "bg-purple-500/10 text-purple-600",
  system:  "bg-muted text-muted-foreground",
};

const FILTERS = ["All", "Outfits", "Weather", "Sales", "Trends"];

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>(notifications);
  const [filter, setFilter] = useState<string[]>([]);

  const unreadCount = items.filter((n) => !n.read).length;

  const filtered = items.filter((n) => {
    if (!filter.length) return true;
    const map: Record<string, Notification["type"]> = {
      Outfits: "outfit", Weather: "weather", Sales: "sale", Trends: "trend",
    };
    return filter.some((f) => map[f] === n.type);
  });

  function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function dismiss(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <DashboardShell
      heading="Notifications"
      subheading="Your outfit alerts, weather tips, sale drops, and trend updates."
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{filtered.length} notifications</p>
          {unreadCount > 0 && <Badge variant="destructive">{unreadCount} unread</Badge>}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" className="gap-2" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </Button>
        )}
      </div>

      <FilterChips
        options={FILTERS.slice(1)}
        selected={filter}
        onChange={setFilter}
      />

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {filtered.map((n) => (
            <motion.div
              key={n.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 40, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "group flex items-start gap-4 rounded-2xl border px-5 py-4 transition-colors",
                n.read
                  ? "border-border/40 bg-card"
                  : "border-brand/20 bg-brand/4",
              )}
            >
              {/* Icon */}
              <div className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                TYPE_COLORS[n.type],
              )}>
                {TYPE_ICONS[n.type]}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm leading-5", !n.read && "font-medium")}>{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{n.time}</p>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {!n.read && (
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.map((i) => i.id === n.id ? { ...i, read: true } : i))}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    aria-label="Mark as read"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dismiss(n.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center">
            <Bell className="h-8 w-8 text-muted-foreground" />
            <p className="text-display-sm">All clear</p>
            <p className="text-sm text-muted-foreground">No notifications match your current filter.</p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
