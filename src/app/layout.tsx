import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "PopForm — La formation continue, version blockbuster 🍿",
  description: "Trouvez, comparez et évaluez les meilleures formations continues en orthophonie. DPC, FIF-PL, présentiel et distanciel.",
  keywords: ["formation", "orthophonie", "DPC", "FIF-PL", "formation continue", "orthophoniste", "popform"],
  authors: [{ name: "PopForm" }],
  openGraph: {
    title: "PopForm — La formation continue, version blockbuster 🍿",
    description: "Consultez le programme et trouvez la formation qui fera décoller votre pratique.",
    url: "https://popform.fr",
    siteName: "PopForm",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PopForm 🍿",
    description: "La formation continue en orthophonie, version blockbuster.",
  },
  robots: { index: true, follow: true },
  metadataBase: new URL("https://popform.fr"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${dmSans.variable} ${spaceGrotesk.variable}`}>
      <head>
        <link rel="icon" href="/favicon2popform.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon2popform.png" />
        <meta name="theme-color" content="#D42B2B" />
        {/* Unregister stale service workers to fix blank-page cache issues */}
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(r=>{for(const sw of r)sw.unregister();})}` }} />
      </head>
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#FFFDF7", color: "#2D1B06", fontFamily: "var(--font-body), sans-serif" }}>
        <AuthProvider>
          <ScrollToTop />
          <Navbar />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
