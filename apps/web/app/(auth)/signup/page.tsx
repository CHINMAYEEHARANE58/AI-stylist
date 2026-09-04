"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Chrome, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { FilterChips } from "@/components/ui/filter-chips";
import { profileAesthetics } from "@/lib/mock-data";
import { authApi } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAppStore();

  const [showPassword, setShowPassword]         = useState(false);
  const [selectedAesthetics, setSelectedAesthetics] = useState<string[]>([]);
  const [name, setName]                          = useState("");
  const [email, setEmail]                        = useState("");
  const [password, setPassword]                  = useState("");
  const [sizes, setSizes]                        = useState("");
  const [loading, setLoading]                    = useState(false);
  const [error, setError]                        = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password) { setError("Please fill in all required fields."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await authApi.signup({ name, email, password, aesthetics: selectedAesthetics, sizes });
      login(res.data.user);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-lg"
    >
      <div className="rounded-[2rem] border border-border/60 bg-card p-8 shadow-xl">
        <p className="text-label-sm mb-2">Create account</p>
        <h1 className="text-display-xl mb-1">Join ClosetAI</h1>
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Log in
          </Link>
        </p>

        <Button variant="outline" className="mt-8 w-full gap-3" disabled>
          <Chrome className="h-4 w-4" />
          Continue with Google
        </Button>

        <div className="my-6 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or fill in your details</span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={handleSignup}>
          {error && (
            <p className="mb-4 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              placeholder="Full name"
              leftIcon={<User className="h-4 w-4" />}
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
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
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Create password (min 8 chars)"
              leftIcon={<Lock className="h-4 w-4" />}
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            <Input
              placeholder="Preferred sizes (optional)"
              label="Sizes (optional)"
              value={sizes}
              onChange={(e) => setSizes(e.target.value)}
            />
          </div>

          {/* Style preferences */}
          <div className="mt-6">
            <p className="text-label-sm mb-3">Your style aesthetics</p>
            <FilterChips
              options={profileAesthetics}
              selected={selectedAesthetics}
              onChange={setSelectedAesthetics}
            />
          </div>

          <Button type="submit" className="mt-8 w-full" size="lg" loading={loading}>
            Create my account
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          By signing up you agree to our{" "}
          <a href="#" className="underline underline-offset-4">Terms</a> and{" "}
          <a href="#" className="underline underline-offset-4">Privacy Policy</a>.
        </p>
      </div>
    </motion.div>
  );
}
