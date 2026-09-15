import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Castline — Know when to cast",
  description: "A local fishing tracker for weather, DNR water evidence, bite windows, and the right lure.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
