import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "灵感宝盒",
  description: "记录灵感 · 分享灵感",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-bg-page text-text-primary font-sans">
        {children}
      </body>
    </html>
  );
}
