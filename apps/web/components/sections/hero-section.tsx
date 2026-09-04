"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Stars, TrendingUp, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const floatingCards = [
  {
    id: "fc1", delay: 0,
    className: "absolute -left-6 bottom-24 hidden w-56 sm:block",
    content: (
      <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-float backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Stars className="h-3.5 w-3.5 text-brand" />
          Pinterest match found
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          87% similarity using your black skirt, satin blouse, and cream sneakers.
        </p>
      </div>
    ),
  },
  {
    id: "fc2", delay: 1.5,
    className: "absolute -right-4 top-24 hidden w-52 sm:block",
    content: (
      <div className="rounded-2xl border border-border/60 bg-card/90 p-4 shadow-float backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xs font-medium">
          <TrendingUp className="h-3.5 w-3.5 text-success" />
          Wardrobe insight
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          You have 24 unique outfit combinations waiting.
        </p>
      </div>
    ),
  },
];

export function HeroSection() {
  return (
    <section className="container-page relative overflow-hidden py-20 sm:py-32">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center overflow-hidden">
        <div className="h-[400px] w-[800px] rounded-full bg-brand/10 blur-[120px]" />
      </div>

      <div className="grid items-center gap-16 lg:grid-cols-2">
        {/* Left */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Badge variant="accent" className="mb-6">
            <Zap className="h-3 w-3" />
            AI wardrobe studio
          </Badge>

          <h1 className="text-display-2xl text-balance">
            Your AI<br />
            <span className="text-brand-dark">Personal</span><br />
            Stylist
          </h1>

          <p className="mt-6 max-w-lg text-balance text-lg leading-8 text-muted-foreground">
            Digitize your closet, generate polished outfits for any moment, recreate Pinterest looks,
            and discover exactly what your wardrobe is missing.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" asChild>
              <Link href="/signup">
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/dashboard">View demo</Link>
            </Button>
          </div>

          {/* Social proof */}
          <div className="mt-10 flex flex-wrap items-center gap-6">
            {[
              ["10K+", "Outfits generated"],
              ["92%",  "Match accuracy"],
              ["4.9★", "User rating"],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-display-sm">{value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right — visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.93 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative"
        >
          {/* Main card mockup */}
          <div className="relative overflow-hidden rounded-[2.5rem] border border-border/60 bg-gradient-to-br from-[#faf5ef] via-[#f0e4d4] to-[#dfc9ae] p-6 shadow-2xl dark:from-[#1a1410] dark:via-[#251c16] dark:to-[#35281e]">
            <div className="text-label-sm mb-4">Today's outfit</div>
            <div className="space-y-2.5">
              {["Ivory Satin Blouse", "Black Tailored Skirt", "Cream Leather Sneakers"].map((item, i) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-3 rounded-2xl bg-background/70 px-4 py-3 backdrop-blur-sm"
                >
                  <div className="h-2 w-2 rounded-full bg-brand" />
                  <span className="text-sm font-medium">{item}</span>
                </motion.div>
              ))}
              <div className="rounded-2xl border border-dashed border-brand/40 bg-background/40 px-4 py-3">
                <span className="text-xs text-brand-dark">+ Gold Layered Necklace</span>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <div>
                <p className="text-label-xs">Confidence</p>
                <p className="mt-1 text-display-md">97%</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl bg-success/10 px-3 py-2">
                <Sparkles className="h-3.5 w-3.5 text-success" />
                <span className="text-xs font-medium text-success">Evening Edit</span>
              </div>
            </div>
          </div>

          {/* Floating cards */}
          {floatingCards.map((fc) => (
            <motion.div
              key={fc.id}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5 + fc.delay, repeat: Infinity, ease: "easeInOut", delay: fc.delay }}
              className={fc.className}
            >
              {fc.content}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
