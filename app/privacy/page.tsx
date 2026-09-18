import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Castline",
  description: "Learn how Castline handles sign-in, location, forecasts, and your private fishing journal data.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "website",
    url: "/privacy",
    title: "Privacy Policy | Castline",
    description: "Learn how Castline handles sign-in, location, forecasts, and your private fishing journal data.",
  },
};

export default function PrivacyPage() {
  return (
    <main className="policy-page">
      <Link href="/">← Back to Castline</Link>
      <h1>Privacy</h1>
      <p>Updated September 16, 2026</p>
      <p>Castline provides fishing forecasts, water information, and a private catch journal. This page explains what the app uses and stores.</p>

      <h2>Google sign-in</h2>
      <p>When you sign in, Google sends Castline a verified account identifier. Castline uses that identifier to keep your journal and saved spots separate from other users. The app requests the OpenID sign-in scope; it does not request access to your Gmail, Drive, contacts, or other Google data. A signed session cookie keeps you signed in for up to seven days. A short-lived cookie protects the sign-in process.</p>

      <h2>Your journal</h2>
      <p>If you save a catch, Castline stores the details you enter, which may include species, size, time, location, weather notes, bait, comments, and an optional photo. Saved waters are also stored. Journal records and photos are kept in the app’s hosted database and file storage, and access is limited to the signed-in account. You can delete individual catches and saved waters in the app. To request removal of remaining account data, contact us below.</p>

      <h2>Forecasts and location</h2>
      <p>Castline uses the water or place you select to request weather and fishing information from public data providers. If you choose “Use my location,” your browser asks permission before sharing your location with the app. Map tiles and external links may send your browser’s IP address and normal browser information to their providers. Your chosen county and water may be stored in your browser so the app can restore them later.</p>

      <h2>Sharing and retention</h2>
      <p>Your journal is not published to other users or used to train Castline’s forecasts. Castline does not sell journal information. Records and photos remain until you delete them or request their removal. Session cookies expire after seven days; signing out removes the cookie from your browser. Hosting and data providers may process technical request information needed to operate their services.</p>

      <h2>Contact</h2>
      <p>For privacy questions or a data removal request, email <a href="mailto:castlinefishing@googlegroups.com">castlinefishing@googlegroups.com</a>.</p>
    </main>
  );
}
