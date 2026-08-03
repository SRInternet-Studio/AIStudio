import type { Config } from "tailwindcss";

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
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        card: "var(--color-card)",
        "card-hover": "var(--color-card-hover)",
        border: "var(--color-border)",
        "border-light": "var(--color-border-light)",
        muted: "var(--color-muted)",
        "muted-foreground": "var(--color-muted-foreground)",
        accent: "var(--color-accent)",
        "accent-hover": "var(--color-accent-hover)",
        primary: "var(--color-primary)",
        "primary-foreground": "var(--color-primary-foreground)",
        destructive: "var(--color-destructive)",
        surface: "var(--color-surface)",
        "surface-variant": "var(--color-surface-variant)",
        sidebar: "var(--color-sidebar)",
        "sidebar-active": "var(--color-sidebar-active)",
        input: "var(--color-input)",
        ring: "var(--color-ring)",
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
