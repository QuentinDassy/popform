import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "popform — La formation continue, version blockbuster 🍿",
  description:
    "Trouvez, comparez et évaluez les meilleures formations continues en orthophonie. DPC, FIF-PL, présentiel et distanciel.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${dmSans.variable} ${spaceGrotesk.variable}`}>
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#FFFDF7", color: "#2D1B06", fontFamily: "var(--font-body), sans-serif" }}>
        <AuthProvider>
          <Navbar />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
