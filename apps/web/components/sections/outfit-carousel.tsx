"use client";

import { CheckCircle2, RefreshCcw, Share2 } from "lucide-react";
import { motion } from "framer-motion";

import { outfitSuggestions } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function OutfitCarousel() {
  return (
    <section className="section-container py-16">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.26em] text-muted-foreground">AI outfit carousel</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl">Swipe through polished styling directions in seconds.</h2>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <RefreshCcw className="h-4 w-4" />
            Regenerate
          </Button>
          <Button>
            <Share2 className="h-4 w-4" />
            Share looks
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {outfitSuggestions.map((outfit, index) => (
          <motion.div
            key={outfit.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: index * 0.08 }}
          >
            <Card className="h-full rounded-[32px]">
              <div className="flex items-center justify-between">
                <Badge>{outfit.occasion}</Badge>
                <span className="text-sm text-muted-foreground">{outfit.score}% fit</span>
              </div>
              <div className="mt-5 rounded-[28px] bg-gradient-to-br from-[#f7efe7] via-[#ede2d7] to-[#d9c2ab] p-5 dark:from-[#221a16] dark:via-[#2f241d] dark:to-[#47382d]">
                <div className="grid grid-cols-3 gap-3">
                  {outfit.items.map((item) => (
                    <div key={item} className="rounded-[22px] bg-background/75 p-3 text-center text-xs font-medium backdrop-blur-xl">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <h3 className="mt-5 font-display text-3xl">{outfit.title}</h3>
              <p className="mt-2 text-sm uppercase tracking-[0.22em] text-muted-foreground">{outfit.mood}</p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{outfit.notes}</p>
              <div className="mt-5 flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[#9b7653]" />
                Accent: {outfit.accent}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

