"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ApiError, authApi } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAppStore();
  const email = useMemo(() => searchParams.get("email") ?? "", [searchParams]);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1_000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (!email) { setError("Your email address is missing. Return to Create Account and try again."); return; }
    if (!/^\d{6}$/.test(code)) { setError("Enter the six-digit verification code."); return; }
    setError(""); setLoading(true);
    try {
      const result = await authApi.verifyEmail(email, code);
      login(result.data.user);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "We could not verify that code. Please try again.");
    } finally { setLoading(false); }
  }

  async function resend() {
    if (!email || cooldown > 0) return;
    setError(""); setMessage(""); setResending(true);
    try {
      await authApi.resendVerification(email);
      setMessage("Verification code sent. Check your inbox.");
      setCooldown(60);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "We could not send a new code. Please try again.");
    } finally { setResending(false); }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
      <div className="rounded-[2rem] border border-border/60 bg-card p-8 shadow-xl">
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-muted">
          <Mail className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-label-sm mb-2">Almost there</p>
        <h1 className="text-display-xl mb-2">Verify your email</h1>
        <p className="text-sm leading-6 text-muted-foreground">We sent a six-digit verification code to <span className="font-medium text-foreground">{email || "your email"}</span>.</p>
        <form onSubmit={verify} className="mt-7 space-y-4">
          {error && <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>}
          {message && <p className="rounded-xl bg-success/10 px-4 py-2.5 text-sm text-success">{message}</p>}
          <label className="block">
            <span className="text-label-sm">Verification code</span>
            <input
              inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-2 h-14 w-full rounded-xl border border-input bg-background px-4 text-center font-display text-2xl tracking-[0.45em] outline-none transition-shadow placeholder:tracking-normal focus:ring-2 focus:ring-ring"
              placeholder="000000" aria-label="Six-digit verification code" />
          </label>
          <Button type="submit" className="w-full" size="lg" loading={loading}>Verify email</Button>
        </form>
        <div className="mt-5 text-center text-sm text-muted-foreground">
          Didn&apos;t get a code?{" "}
          <button type="button" onClick={resend} disabled={!email || cooldown > 0 || resending} className="font-medium text-foreground underline underline-offset-4 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50">
            {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </button>
        </div>
        <div className="mt-6 flex justify-center">
          <Link href="/login" className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Back to login</Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<div className="w-full max-w-md" aria-busy="true" />}><VerifyEmailForm /></Suspense>;
}
