"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState("");
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError("Please enter your email address."); return; }
    setError("");
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      // Per security best practice, always show success to prevent enumeration
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <div className="rounded-[2rem] border border-border/60 bg-card p-8 shadow-xl">
        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="text-label-sm mb-2">Password reset</p>
              <h1 className="text-display-xl mb-1">Forgot password?</h1>
              <p className="mb-8 text-sm text-muted-foreground">
                Enter your email and we'll send a reset link if an account exists.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>
                )}
                <Input
                  type="email"
                  placeholder="Email address"
                  leftIcon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <Button type="submit" className="w-full" size="lg" loading={loading}>
                  Send reset link
                </Button>
              </form>

              <div className="mt-6 flex justify-center">
                <Link href="/login" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to login
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <CheckCircle2 className="mx-auto h-12 w-12 text-success mb-4" />
              <h1 className="text-display-xl mb-2">Check your inbox</h1>
              <p className="text-sm text-muted-foreground mb-8">
                If an account exists for <strong>{email}</strong>, a password reset link has been sent.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/login">Back to login</Link>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
