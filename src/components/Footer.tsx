"use client";
import Link from "next/link";

const C = { borderLight: "#F5EDD8", textTer: "#A48C6A" };

export default function Footer() {
  return (
    <footer style={{ padding: "20px 40px", borderTop: "1px solid " + C.borderLight, display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1240, margin: "0 auto", width: "100%", flexWrap: "wrap", gap: 8 }}>
      <span style={{ fontSize: 11, color: C.textTer }}>© 2026 popform — La formation, façon blockbuster 🍿</span>
      <div style={{ display: "flex", gap: 16 }}>
        {["Mentions légales", "CGU", "Contact"].map(l => (
          <Link key={l} href="#" style={{ fontSize: 11, color: C.textTer, textDecoration: "none" }}>{l}</Link>
        ))}
      </div>
    </footer>
  );
}
