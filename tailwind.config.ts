import type { Config } from "tailwindcss";

// Wrap CSS-variable colors with color-mix so opacity modifiers (e.g. bg-destructive/95)
// work. A plain var(--color-x) value is opaque to Tailwind, so classes like
// bg-destructive/95 were silently dropped and the element rendered transparent.
const withAlpha = (variable: string) =>
  `color-mix(in srgb, ${variable} calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: withAlpha("var(--color-background)"),
        foreground: withAlpha("var(--color-foreground)"),
        card: withAlpha("var(--color-card)"),
        "card-hover": withAlpha("var(--color-card-hover)"),
        border: withAlpha("var(--color-border)"),
        "border-light": withAlpha("var(--color-border-light)"),
        muted: withAlpha("var(--color-muted)"),
        "muted-foreground": withAlpha("var(--color-muted-foreground)"),
        accent: withAlpha("var(--color-accent)"),
        "accent-hover": withAlpha("var(--color-accent-hover)"),
        primary: withAlpha("var(--color-primary)"),
        "primary-foreground": withAlpha("var(--color-primary-foreground)"),
        destructive: withAlpha("var(--color-destructive)"),
        surface: withAlpha("var(--color-surface)"),
        "surface-variant": withAlpha("var(--color-surface-variant)"),
        sidebar: withAlpha("var(--color-sidebar)"),
        "sidebar-active": withAlpha("var(--color-sidebar-active)"),
        input: withAlpha("var(--color-input)"),
        ring: withAlpha("var(--color-ring)"),
      },
      fontFamily: {
        sans: ["Google Sans", "Roboto", "system-ui", "sans-serif"],
        mono: ["Roboto Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
