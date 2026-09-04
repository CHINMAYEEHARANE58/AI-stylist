import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Minimal header */}
      <header className="flex h-16 items-center border-b border-border/40 px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="font-display text-lg">ClosetAI</span>
        </Link>
      </header>

      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-brand/8 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-brand/6 blur-[80px]" />
        <div className="absolute inset-0 bg-grid-dots bg-grid-dots opacity-[0.03]" />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </main>
    </div>
  );
}
