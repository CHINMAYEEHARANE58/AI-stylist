"use client";

import { useEffect } from "react";
import { authApi } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";

/** Restores identity exclusively from the secure server-side session on app startup. */
export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const finishAuthCheck = useAppStore((state) => state.finishAuthCheck);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const response = await authApi.me();
        if (active) finishAuthCheck(response.data.user);
      } catch {
        if (active) finishAuthCheck(null);
      }
    };
    void restore();
    const clearSession = () => finishAuthCheck(null);
    window.addEventListener("closetai:unauthorized", clearSession);
    return () => { active = false; window.removeEventListener("closetai:unauthorized", clearSession); };
  }, [finishAuthCheck]);

  return <>{children}</>;
}
