import type { Metadata } from "next";
import "./globals.css";
import PasswordGateProvider from "@/components/layout/PasswordGateProvider";

export const metadata: Metadata = {
  title: "AI Studio",
  description: "AI Studio Clone - Custom Base URL & Local Context Storage",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/icon.ico", type: "image/x-icon" },
    ],
  },
};

// Runs before hydration to prevent theme flash
const themeInitScript = `
(function() {
  try {
    var theme = localStorage.getItem('app-theme') || 'dark';
    var root = document.documentElement;
    if (theme === 'system') {
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="h-dvh bg-background text-foreground overflow-hidden">
        <PasswordGateProvider>
          {children}
        </PasswordGateProvider>
      </body>
    </html>
  );
}
