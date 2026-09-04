"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import { testimonials } from "@/lib/mock-data";

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="container-page py-20 sm:py-28">
      <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <p className="text-label-md mb-3">Reviews</p>
          <h2 className="text-display-xl text-balance">
            People use ClosetAI because it feels genuinely personal.
          </h2>
        </div>
        <p className="max-w-xs text-sm leading-6 text-muted-foreground">
          The recommendations are smart enough to feel like real styling guidance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: i * 0.07, duration: 0.45 }}
          >
            <div className="flex h-full flex-col rounded-3xl border border-border/60 bg-card p-6 shadow-card">
              {/* Stars */}
              <div className="mb-4 flex gap-0.5">
                {Array.from({ length: t.rating ?? 5 }).map((_, si) => (
                  <Star key={si} className="h-4 w-4 fill-brand text-brand" />
                ))}
              </div>

              <p className="flex-1 text-base leading-7 text-foreground">
                &ldquo;{t.quote}&rdquo;
              </p>

              <div className="mt-6 flex items-center gap-3 border-t border-border/50 pt-5">
                {t.avatar && (
                  <Image
                    src={t.avatar}
                    alt={t.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
