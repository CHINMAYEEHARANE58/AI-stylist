"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Chrome, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { FilterChips } from "@/components/ui/filter-chips";
import { profileAesthetics } from "@/lib/mock-data";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAesthetics, setSelectedAesthetics] = useState<string[]>([]);

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

        <Button variant="outline" className="mt-8 w-full gap-3" asChild>
          <a href="#">
            <Chrome className="h-4 w-4" />
            Continue with Google
          </a>
        </Button>

        <div className="my-6 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or fill in your details</span>
          <Separator className="flex-1" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            placeholder="Full name"
            leftIcon={<User className="h-4 w-4" />}
            label="Name"
          />
          <Input
            type="email"
            placeholder="Email address"
            leftIcon={<Mail className="h-4 w-4" />}
            label="Email"
          />
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Create password"
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
          <Input placeholder="Preferred sizes" label="Sizes (optional)" />
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

        <Button className="mt-8 w-full" size="lg" asChild>
          <Link href="/dashboard">Create my account</Link>
        </Button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          By signing up you agree to our{" "}
          <a href="#" className="underline underline-offset-4">Terms</a> and{" "}
          <a href="#" className="underline underline-offset-4">Privacy Policy</a>.
        </p>
      </div>
    </motion.div>
  );
}
