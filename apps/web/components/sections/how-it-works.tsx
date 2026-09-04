"use client";

import { motion } from "framer-motion";
import { howItWorksSteps } from "@/lib/mock-data";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="container-page py-20 sm:py-28">
      {/* Background strip */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-primary px-8 py-16 sm:px-14 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-grid-dots bg-grid-dots opacity-5" />

        <div className="mb-12 max-w-xl">
          <p className="text-label-sm text-primary-foreground/60 mb-3">How it works</p>
          <h2 className="text-display-xl text-primary-foreground text-balance">
            From cluttered wardrobe to confident styling in four steps.
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {howItWorksSteps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.1, duration: 0.45 }}
              className="relative"
            >
              {/* Connector line */}
              {i < howItWorksSteps.length - 1 && (
                <div className="absolute -right-3 top-5 hidden h-px w-6 bg-primary-foreground/20 lg:block" />
              )}
              <div className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 font-display text-lg text-primary-foreground">
                  {step.step}
                </div>
                <h3 className="mb-2 font-semibold text-primary-foreground">{step.title}</h3>
                <p className="text-sm leading-6 text-primary-foreground/60">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
