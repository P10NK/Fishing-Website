import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use | Castline",
  description: "Read the terms for using Castline fishing forecasts, water information, and your personal catch journal.",
  alternates: { canonical: "/terms" },
  openGraph: {
    type: "website",
    url: "/terms",
    title: "Terms of Use | Castline",
    description: "Read the terms for using Castline fishing forecasts, water information, and your personal catch journal.",
  },
};

export default function TermsPage() {
  return (
    <main className="policy-page">
      <Link href="/">← Back to Castline</Link>
      <h1>Terms of use</h1>
      <p>Updated September 16, 2026</p>
      <p>Castline offers fishing forecasts, water information, and a personal catch journal. By using the app, you agree to use it lawfully and to provide only content you have the right to upload.</p>

      <h2>Fishing information</h2>
      <p>Forecast scores, water estimates, species records, and map details are informational. They may be incomplete, delayed, or inaccurate. Check local regulations, weather warnings, access rules, and on-site conditions before fishing. Castline does not guarantee a catch or the safety or legality of any location.</p>

      <h2>Your content</h2>
      <p>You remain responsible for the catches, notes, and photos you add. Castline stores them to provide your private journal. Do not upload unlawful content or material that infringes someone else’s rights.</p>

      <h2>Third-party services</h2>
      <p>Castline links to and uses information from services such as Google, weather providers, map providers, and fisheries agencies. Their services and terms may apply when you use them. Castline may change or discontinue features as providers and data sources change.</p>

      <h2>Contact</h2>
      <p>Questions about these terms can be sent to <a href="mailto:castlinefishing@googlegroups.com">castlinefishing@googlegroups.com</a>.</p>
    </main>
  );
}
