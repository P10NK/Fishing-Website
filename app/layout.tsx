import type { Metadata } from "next";
import "./globals.css";
import { SEO_DESCRIPTION } from "@/lib/brand";

export const metadata: Metadata = {
  metadataBase: new URL("https://castlinefishing.com"),
  title: "Wisconsin Fishing Forecast & Catch Journal | Castline",
  description: SEO_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Castline",
    title: "Wisconsin Fishing Forecast & Catch Journal | Castline",
    description: SEO_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: "Wisconsin Fishing Forecast & Catch Journal | Castline",
    description: SEO_DESCRIPTION,
  },
  icons: {
    icon: { url: "/castline-logo.png", type: "image/png", sizes: "500x500" },
    shortcut: "/castline-logo.png",
    apple: "/castline-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6045971314791320"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
