"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart3, Compass, LayoutDashboard, Shirt, ShoppingBag,
  Sparkles, User2, Settings, Bell, ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const navLinks = [
  { href: "/dashboard",       label: "Dashboard",  icon: LayoutDashboard },
  { href: "/wardrobe",        label: "Wardrobe",   icon: Shirt },
  { href: "/outfits",         label: "Outfits",    icon: Sparkles },
  { href: "/pinterest-match", label: "Match",      icon: Compass },
  { href: "/shopping",        label: "Shopping",   icon: ShoppingBag },
  { href: "/insights",        label: "Insights",   icon: BarChart3 },
  { href: "/profile",         label: "Profile",    icon: User2 },
];

interface DashboardShellProps {
  children: React.ReactNode;
  heading: string;
  subheading?: string;
}

export function DashboardShell({ children, heading, subheading }: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-screen bg-background">
        {/* ── Desktop sidebar ──────────────────────────── */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border/50 bg-card/50 lg:flex">
          <div className="flex h-16 items-center gap-2.5 border-b border-border/50 px-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="font-display text-lg tracking-tight">ClosetAI</span>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all duration-150",
                    active
                      ? "bg-primary text-primary-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                  {active && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-60" />}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border/50 p-3 space-y-1">
            <Link
              href="/notifications"
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
            >
              <Bell className="h-4 w-4" />
              Notifications
              <Badge variant="destructive" size="sm" className="ml-auto">3</Badge>
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>

          <div className="border-t border-border/50 p-4">
            <div className="flex items-center gap-3">
              <Avatar size="sm">
                <AvatarFallback>MK</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">Maya Kapoor</p>
                <p className="truncate text-xs text-muted-foreground">maya@closetai.com</p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────── */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Page header */}
          <div className="border-b border-border/50 bg-card/30 px-5 py-5 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <p className="text-label-sm mb-1">ClosetAI</p>
              <h1 className="text-display-xl">{heading}</h1>
              {subheading && (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{subheading}</p>
              )}
            </motion.div>
          </div>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-5 pb-28 lg:p-8 lg:pb-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="space-y-6"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>

      {/* ── Mobile bottom nav ──────────────────────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-background/90 backdrop-blur-xl lg:hidden">
        <div className="grid h-16 grid-cols-5">
          {navLinks.slice(0, 5).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-[10px] transition-colors",
                  active ? "text-primary font-medium" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </TooltipProvider>
  );
}
