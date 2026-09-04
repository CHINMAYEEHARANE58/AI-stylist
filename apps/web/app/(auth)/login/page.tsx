"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Chrome, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <div className="rounded-[2rem] border border-border/60 bg-card p-8 shadow-xl">
        {/* Heading */}
        <p className="text-label-sm mb-2">Welcome back</p>
        <h1 className="text-display-xl mb-1">Log in</h1>
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
            Sign up free
          </Link>
        </p>

        {/* Google */}
        <Button variant="outline" className="mt-8 w-full gap-3" asChild>
          <a href="#">
            <Chrome className="h-4 w-4" />
            Continue with Google
          </a>
        </Button>

        <div className="my-6 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <Input
            type="email"
            placeholder="Email address"
            leftIcon={<Mail className="h-4 w-4" />}
            label="Email"
          />
          <div>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              leftIcon={<Lock className="h-4 w-4" />}
              label="Password"
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
            <div className="mt-2 flex justify-end">
              <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Forgot password?
              </Link>
            </div>
          </div>
        </div>

        <Button className="mt-6 w-full" size="lg" asChild>
          <Link href="/dashboard">Log in to ClosetAI</Link>
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <a href="#" className="underline underline-offset-4">Terms</a> and{" "}
          <a href="#" className="underline underline-offset-4">Privacy Policy</a>.
        </p>
      </div>
    </motion.div>
  );
}
