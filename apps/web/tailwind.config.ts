import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      /* ── Brand palette ───────────────────────────────── */
      colors: {
        background:   "hsl(var(--background))",
        foreground:   "hsl(var(--foreground))",
        card:         { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover:      { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        primary:      { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary:    { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted:        { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent:       { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive:  { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border:       "hsl(var(--border))",
        input:        "hsl(var(--input))",
        ring:         "hsl(var(--ring))",
        /* fixed brand tokens */
        brand: {
          DEFAULT:  "#D8B98A",
          light:    "#EDD9BB",
          dark:     "#B8955E",
          ink:      "#111111",
        },
        success:  "#3CB371",
        warning:  "#F5A623",
        error:    "#EF4444",
      },

      /* ── Typography ──────────────────────────────────── */
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          '"Iowan Old Style"',
          '"Palatino Linotype"',
          '"Book Antiqua"',
          "Georgia",
          "serif",
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          "ui-monospace",
          "monospace",
        ],
      },

      /* ── Spacing / radius ────────────────────────────── */
      borderRadius: {
        lg:   "var(--radius)",
        md:   "calc(var(--radius) - 2px)",
        sm:   "calc(var(--radius) - 4px)",
        xl:   "1rem",
        "2xl":"1.5rem",
        "3xl":"2rem",
        "4xl":"2.5rem",
        "5xl":"3rem",
      },

      /* ── Shadows ─────────────────────────────────────── */
      boxShadow: {
        xs:    "0 1px 2px rgba(0,0,0,0.05)",
        sm:    "0 2px 8px rgba(0,0,0,0.06)",
        md:    "0 4px 20px rgba(0,0,0,0.08)",
        lg:    "0 8px 40px rgba(0,0,0,0.10)",
        xl:    "0 16px 60px rgba(0,0,0,0.12)",
        "2xl": "0 24px 80px rgba(0,0,0,0.14)",
        glow:  "0 0 0 3px rgba(216,185,138,0.35)",
        float: "0 20px 60px rgba(17,17,17,0.12), 0 4px 16px rgba(17,17,17,0.06)",
        card:  "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
        "accent-glow": "0 0 40px rgba(216,185,138,0.25)",
        inset: "inset 0 1px 3px rgba(0,0,0,0.06)",
      },

      /* ── Background patterns ─────────────────────────── */
      backgroundImage: {
        "grid-dots":     "radial-gradient(circle, rgba(17,17,17,0.08) 1px, transparent 1px)",
        "grid-lines":    "linear-gradient(rgba(17,17,17,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(17,17,17,0.04) 1px, transparent 1px)",
        "gradient-warm": "linear-gradient(135deg, #f9f4ee 0%, #eedece 50%, #d9bfa0 100%)",
        "gradient-radial":"radial-gradient(ellipse at center, var(--tw-gradient-stops))",
      },
      backgroundSize: {
        "grid-dots":  "24px 24px",
        "grid-lines": "40px 40px",
      },

      /* ── Transitions ─────────────────────────────────── */
      transitionTimingFunction: {
        spring:  "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        smooth:  "cubic-bezier(0.4, 0, 0.2, 1)",
        snappy:  "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
      transitionDuration: {
        DEFAULT: "200ms",
        fast:    "100ms",
        normal:  "200ms",
        slow:    "350ms",
        slower:  "500ms",
      },

      /* ── Keyframes & animations ──────────────────────── */
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":       { transform: "translateY(-14px)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(100%)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down":  "accordion-down 0.2s ease-out",
        "accordion-up":    "accordion-up 0.2s ease-out",
        float:             "float 8s ease-in-out infinite",
        "float-slow":      "float 12s ease-in-out infinite",
        shimmer:           "shimmer 1.8s linear infinite",
        "fade-in":         "fade-in 0.3s ease",
        "fade-up":         "fade-up 0.4s ease",
        "scale-in":        "scale-in 0.2s ease",
        "slide-in-right":  "slide-in-right 0.3s ease",
        "slide-up":        "slide-up 0.3s ease",
      },
    },
  },
  plugins: [],
};

export default config;
