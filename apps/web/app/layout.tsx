import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title:       { default: "ClosetAI — Your AI Personal Stylist", template: "%s | ClosetAI" },
  description: "Digitize your wardrobe, generate AI outfits for any occasion, recreate Pinterest looks, and shop smarter with ClosetAI.",
  keywords:    ["AI stylist", "wardrobe app", "outfit generator", "fashion AI", "personal styling"],
  openGraph: {
    title:       "ClosetAI — Your AI Personal Stylist",
    description: "Digitize your wardrobe, generate AI outfits, recreate Pinterest looks.",
    type:        "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
    { media: "(prefers-color-scheme: dark)",  color: "#0f0f0f" },
  ],
  width:        "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange={false}
        >
          <Providers>
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
