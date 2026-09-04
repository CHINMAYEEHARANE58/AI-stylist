"use client";

import { Camera, HeartHandshake, ScanSearch, ShoppingBag, Sparkles, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import { features } from "@/lib/mock-data";

const icons = [Camera, Sparkles, Wand2, ScanSearch, ShoppingBag, HeartHandshake];

export function FeatureGrid() {
  return (
    <section id="features" className="container-page py-20 sm:py-28">
      <div className="mb-14 max-w-2xl">
        <p className="text-label-md mb-3">Features</p>
        <h2 className="text-display-xl text-balance">
          Built like a luxury styling assistant, not a closet spreadsheet.
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {features.map((feature, i) => {
          const Icon = icons[i % icons.length];
          const isLarge = i === 0 || i === 5;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: i * 0.07, duration: 0.45 }}
              className={isLarge ? "sm:col-span-2 xl:col-span-1" : ""}
            >
              <div className="group h-full rounded-3xl border border-border/60 bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/15 text-brand-dark transition-colors group-hover:bg-brand/25">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-display-sm mb-2">{feature.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
