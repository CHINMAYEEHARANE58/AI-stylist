"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <div className="rounded-[2rem] border border-border/60 bg-card p-8 shadow-xl">
        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10">
              <Mail className="h-6 w-6 text-success" />
            </div>
            <h2 className="text-display-md mb-2">Check your inbox</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              We've sent a secure reset link to your email. It expires in 30 minutes.
            </p>
            <Button variant="outline" className="mt-8 w-full" asChild>
              <Link href="/login">
                <ArrowLeft className="h-4 w-4" />
                Back to log in
              </Link>
            </Button>
          </motion.div>
        ) : (
          <>
            <p className="text-label-sm mb-2">Password recovery</p>
            <h1 className="text-display-xl mb-2">Reset your password</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Enter the email address associated with your account and we'll send you a secure reset link.
            </p>

            <div className="mt-8">
              <Input
                type="email"
                placeholder="Email address"
                leftIcon={<Mail className="h-4 w-4" />}
                label="Email"
              />
            </div>

            <Button className="mt-6 w-full" size="lg" onClick={() => setSent(true)}>
              Send reset link
            </Button>

            <Button variant="ghost" className="mt-3 w-full" asChild>
              <Link href="/login">
                <ArrowLeft className="h-4 w-4" />
                Back to log in
              </Link>
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
