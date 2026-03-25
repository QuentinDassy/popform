import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "PopForm - La formation continue, version blockbuster 🍿",
  description: "Trouvez, comparez et évaluez les meilleures formations continues en orthophonie. DPC, FIF-PL, présentiel et distanciel.",
  keywords: ["formation", "orthophonie", "DPC", "FIF-PL", "formation continue", "orthophoniste", "popform"],
  authors: [{ name: "PopForm" }],
  openGraph: {
    title: "PopForm - La formation continue, version blockbuster 🍿",
    description: "Consultez le programme et trouvez la formation qui fera décoller votre pratique.",
    url: "https://popform.fr",
    siteName: "PopForm",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "https://popform.fr/og-image.png", width: 2048, height: 1080, alt: "PopForm — L'annuaire des formations en orthophonie" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PopForm 🍿",
    description: "La formation continue en orthophonie, version blockbuster.",
    images: ["https://popform.fr/og-image.png"],
  },
  robots: { index: true, follow: true },
  metadataBase: new URL("https://popform.fr"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${jakarta.variable}`}>
      <head>
        <link rel="icon" href="/favicon2popform.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon2popform.png" />
        <meta name="theme-color" content="#D42B2B" />
        {/* Unregister stale service workers + auto-reload on chunk load errors */}
        <script dangerouslySetInnerHTML={{ __html: `
if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(r){for(var sw of r)sw.unregister();});}
window.addEventListener('error',function(e){
  var isChunk=e.message&&(e.message.indexOf('Loading chunk')>-1||e.message.indexOf('ChunkLoadError')>-1||e.message.indexOf('Failed to fetch dynamically')>-1);
  var isScript=e.target&&(e.target.tagName==='SCRIPT'||e.target.tagName==='LINK')&&(e.target.src||e.target.href||'').indexOf('/_next/')>-1;
  if((isChunk||isScript)&&!sessionStorage.getItem('_reloaded')){sessionStorage.setItem('_reloaded','1');window.location.reload();}
},true);
        `}} />
      </head>
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#FFFDF7", color: "#2D1B06", fontFamily: "var(--font-body), sans-serif" }}>
        <AuthProvider>
          <ScrollToTop />
          <Navbar />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
