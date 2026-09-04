"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Sparkles, Menu, X, BarChart3, Compass, LayoutDashboard,
  Shirt, ShoppingBag, User2, Bell, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const marketingLinks = [
  { href: "#features",      label: "Features" },
  { href: "#how-it-works",  label: "How it works" },
  { href: "#testimonials",  label: "Reviews" },
];

const appLinks = [
  { href: "/dashboard",       label: "Dashboard",  icon: LayoutDashboard },
  { href: "/wardrobe",        label: "Wardrobe",   icon: Shirt },
  { href: "/outfits",         label: "Outfits",    icon: Sparkles },
  { href: "/pinterest-match", label: "Match",      icon: Compass },
  { href: "/shopping",        label: "Shopping",   icon: ShoppingBag },
  { href: "/insights",        label: "Insights",   icon: BarChart3 },
];

export function Navbar({ variant = "marketing" }: { variant?: "marketing" | "app" }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-2xl"
      >
        <div className="container-page flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-display text-xl tracking-tight">ClosetAI</span>
          </Link>

          {/* Desktop nav */}
          {variant === "marketing" ? (
            <nav className="hidden items-center gap-6 lg:flex">
              {marketingLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          ) : (
            <nav className="hidden items-center gap-1 lg:flex">
              {appLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                    pathname === href
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              ))}
            </nav>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {variant === "marketing" ? (
              <div className="hidden items-center gap-2 sm:flex">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/signup">
                    Get started
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/notifications" aria-label="Notifications">
                    <Bell className="h-4 w-4" />
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-accent/50 transition-colors">
                      <Avatar size="sm">
                        <AvatarFallback>MK</AvatarFallback>
                      </Avatar>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/profile">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/login">Log out</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur-xl lg:hidden overflow-hidden"
          >
            <nav className="container-page flex flex-col gap-1 py-4">
              {variant === "marketing"
                ? marketingLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  ))
                : appLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  ))}
              {variant === "marketing" && (
                <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                  <Button variant="outline" asChild onClick={() => setMobileOpen(false)}>
                    <Link href="/login">Log in</Link>
                  </Button>
                  <Button asChild onClick={() => setMobileOpen(false)}>
                    <Link href="/signup">Get started</Link>
                  </Button>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
