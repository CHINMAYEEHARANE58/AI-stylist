"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const isLoading = useAppStore((state) => state.isLoading);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace(`/login?from=${encodeURIComponent(pathname)}`);
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-background" aria-busy="true" aria-label="Checking your secure session" />;
  }
  return <>{children}</>;
}
