"use client";
import { useState } from "react";
import Link from "next/link";
import { C } from "@/lib/data";

export default function ContactPage() {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const inputStyle: React.CSSProperties = { padding: "12px 14px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.bgAlt, color: C.text, fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit" };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 24px" }}>
      <div style={{ padding: "18px 0 14px" }}>
        <Link href="/" style={{ color: C.textTer, fontSize: 13, textDecoration: "none" }}>← Accueil</Link>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, marginTop: 6 }}>Contact 🍿</h1>
        <p style={{ fontSize: 14, color: C.textTer, marginTop: 4 }}>Une question, une suggestion, un partenariat ?</p>
      </div>

      {sent ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Message envoyé !</p>
          <p style={{ fontSize: 13, color: C.textTer, marginTop: 6 }}>Nous vous répondrons dans les plus brefs délais.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 40 }}>
          <div><label style={{ fontSize: 12, fontWeight: 700, color: C.textTer, display: "block", marginBottom: 4 }}>Nom</label><input value={nom} onChange={e => setNom(e.target.value)} placeholder="Votre nom" style={inputStyle} /></div>
          <div><label style={{ fontSize: 12, fontWeight: 700, color: C.textTer, display: "block", marginBottom: 4 }}>Email</label><input value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.fr" type="email" style={inputStyle} /></div>
          <div><label style={{ fontSize: 12, fontWeight: 700, color: C.textTer, display: "block", marginBottom: 4 }}>Message</label><textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Votre message..." style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} /></div>
          <button onClick={async () => { if (nom && email && message) { try { await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nom, email, message }) }); setSent(true) } catch { setSent(true) } } }} style={{ padding: "14px 28px", borderRadius: 12, border: "none", background: C.gradient, color: "#fff", fontSize: 14.5, fontWeight: 700, cursor: "pointer", alignSelf: "flex-start" }}>Envoyer 🍿</button>
          <p style={{ fontSize: 12, color: C.textTer }}>Ou directement par email : <a href="mailto:contact@popform.fr" style={{ color: C.accent, fontWeight: 600 }}>contact@popform.fr</a></p>
        </div>
      )}
    </div>
  );
}
