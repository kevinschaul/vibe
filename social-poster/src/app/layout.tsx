import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vibe — Social Media Manager",
  description: "Post to Bluesky, X, and Mastodon from one place",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="font-sans antialiased h-full bg-zinc-50 dark:bg-zinc-950">
        {children}
      </body>
    </html>
  );
}
