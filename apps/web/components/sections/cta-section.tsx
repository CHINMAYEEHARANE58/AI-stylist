"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="container-page py-20 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-[2.5rem] bg-primary px-8 py-20 text-center sm:px-16"
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />

        <div className="relative">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground/10 backdrop-blur">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="text-display-xl text-primary-foreground text-balance mx-auto max-w-2xl">
            Start styling smarter today. It's free.
          </h2>
          <p className="mt-4 text-base leading-7 text-primary-foreground/60 max-w-lg mx-auto">
            Join thousands of people who've already digitized their wardrobe and stopped wasting time getting dressed.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="xl"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              asChild
            >
              <Link href="/signup">
                Create free account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="xl"
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:border-primary-foreground/50"
              asChild
            >
              <Link href="/dashboard">View live demo</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-primary-foreground/40">
            No credit card required · Cancel anytime
          </p>
        </div>
      </motion.div>
    </section>
  );
}
