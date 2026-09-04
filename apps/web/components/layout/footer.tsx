import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const footerLinks = {
  Product: [
    { label: "Dashboard",    href: "/dashboard" },
    { label: "Wardrobe",     href: "/wardrobe" },
    { label: "AI Outfits",   href: "/outfits" },
    { label: "Shopping",     href: "/shopping" },
    { label: "Insights",     href: "/insights" },
  ],
  Company: [
    { label: "About",       href: "#" },
    { label: "Blog",        href: "#" },
    { label: "Careers",     href: "#" },
    { label: "Press",       href: "#" },
  ],
  Support: [
    { label: "Help Centre",  href: "#" },
    { label: "Privacy",      href: "#" },
    { label: "Terms",        href: "#" },
    { label: "Contact",      href: "#" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="container-page py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-display text-xl">ClosetAI</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
              Your AI-powered personal stylist. Digitize your wardrobe, generate outfits, and shop smarter.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {["Instagram", "Pinterest", "TikTok", "X"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <p className="text-label-sm mb-4">{category}</p>
              <ul className="space-y-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-10" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ClosetAI Inc. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Styled by AI. Owned by you.
          </p>
        </div>
      </div>
    </footer>
  );
}
