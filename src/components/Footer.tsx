"use client";
import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{ padding: "16px 16px", borderTop: "1px solid #F5EDD8", display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1240, margin: "0 auto", width: "100%", flexWrap: "wrap", gap: 8 }}>
      <span style={{ fontSize: 11, color: "#A48C6A" }}>© 2026 popform — La formation, façon blockbuster 🍿</span>
      <div style={{ display: "flex", gap: 16 }}>
        {["Mentions légales", "CGU", "Contact"].map(l => (<Link key={l} href="#" style={{ fontSize: 11, color: "#A48C6A", textDecoration: "none" }}>{l}</Link>))}
      </div>
    </footer>
  );
}
