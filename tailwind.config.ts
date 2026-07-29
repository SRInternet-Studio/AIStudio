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
        background: "#1e1f20",
        foreground: "#e3e3e3",
        card: "#292a2d",
        "card-hover": "#35363a",
        border: "#3c4043",
        "border-light": "#5f6368",
        muted: "#9aa0a6",
        "muted-foreground": "#9aa0a6",
        accent: "#8ab4f8",
        "accent-hover": "#aecbfa",
        primary: "#8ab4f8",
        "primary-foreground": "#1e1f20",
        destructive: "#f28b82",
        surface: "#292a2d",
        "surface-variant": "#35363a",
        sidebar: "#1e1f20",
        "sidebar-active": "#35363a",
        input: "#35363a",
        ring: "#8ab4f8",
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
