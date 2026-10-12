"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";
import { Suspense, useState } from "react";
import { authApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) { setError("This password reset link is missing or invalid."); return; }
    if (password.length < 8) { setError("Use at least 8 characters for your new password."); return; }
    if (password !== confirmation) { setError("Your passwords do not match."); return; }
    setError(""); setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setComplete(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "We could not reset your password. Please try again.");
    } finally { setLoading(false); }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
      <div className="rounded-[2rem] border border-border/60 bg-card p-8 shadow-xl">
        {complete ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-success" />
            <p className="text-label-sm mb-2">Password updated</p>
            <h1 className="text-display-xl mb-2">You&apos;re all set</h1>
            <p className="mb-8 text-sm text-muted-foreground">Sign in with your new password to continue.</p>
            <Button className="w-full" onClick={() => router.push("/login")}>Go to login</Button>
          </div>
        ) : (
          <>
            <p className="text-label-sm mb-2">Password reset</p>
            <h1 className="text-display-xl mb-2">Choose a new password</h1>
            <p className="mb-7 text-sm text-muted-foreground">Use at least 8 characters and keep it somewhere safe.</p>
            <form onSubmit={submit} className="space-y-4">
              {error && <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>}
              <Input
                type={showPassword ? "text" : "password"} label="New password" placeholder="New password"
                leftIcon={<Lock className="h-4 w-4" />} value={password} onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                rightIcon={<button type="button" onClick={() => setShowPassword((value) => !value)} className="text-muted-foreground hover:text-foreground" aria-label="Toggle password visibility">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>}
              />
              <Input type={showPassword ? "text" : "password"} label="Confirm new password" placeholder="Confirm new password" leftIcon={<Lock className="h-4 w-4" />} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" />
              <Button type="submit" className="w-full" size="lg" loading={loading}>Reset password</Button>
            </form>
            <div className="mt-6 flex justify-center"><Link href="/login" className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" /> Back to login</Link></div>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="w-full max-w-md" aria-busy="true" />}><ResetPasswordForm /></Suspense>;
}
