"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 flex items-center justify-center">
        <div className="h-[500px] w-[500px] rounded-full bg-brand/8 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md"
      >
        {/* Animated number */}
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="mb-8 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#faf5ef] to-[#e8d5bc] dark:from-[#1a1410] dark:to-[#2e1f16] shadow-float"
        >
          <Sparkles className="h-9 w-9 text-brand" />
        </motion.div>

        <p className="text-display-2xl mb-3">404</p>
        <h1 className="text-display-lg mb-4">Page not found</h1>
        <p className="text-base leading-7 text-muted-foreground mb-10">
          Looks like this outfit doesn't exist in your wardrobe. Let's get you back to something stylish.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/">Go to homepage</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
