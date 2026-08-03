import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Studio",
  description: "AI Studio Clone - Custom Base URL & Local Context Storage",
};

// Theme initialization script - runs before hydration to prevent flash
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
        {children}
      </body>
    </html>
  );
}
