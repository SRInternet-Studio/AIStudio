import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Studio",
  description: "AI Studio Clone - Custom Base URL & Local Context Storage",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
