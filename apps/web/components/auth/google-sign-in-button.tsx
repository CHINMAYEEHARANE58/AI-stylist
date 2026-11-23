"use client";

import { useState } from "react";
import { Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api-client";

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function startGoogleSignIn() {
    setError("");
    setLoading(true);
    try {
      const status = await authApi.googleStatus();
      if (!status.data.available) {
        setError("Google sign-in isn't available yet. Please use email and password for now.");
        return;
      }
      window.location.assign(authApi.googleSignInUrl());
    } catch {
      setError("Google sign-in could not be started. Please try again or use email and password.");
    } finally {
      setLoading(false);
    }
  }

  return <>
    <Button variant="outline" className="mt-8 w-full gap-3" type="button" loading={loading} onClick={startGoogleSignIn}>
      <Chrome className="h-4 w-4" />
      Continue with Google
    </Button>
    {error && <p role="alert" className="mt-3 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</p>}
  </>;
}
