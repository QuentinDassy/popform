"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { C } from "@/lib/data";

export default function ConfirmPage() {
  const { user, loading } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading) setReady(true);
  }, [loading]);

  if (!ready) {
    return (
      <div style={{ textAlign: "center", padding: 80, color: C.textTer }}>
        Chargement…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, marginBottom: 8 }}>
          Email confirmé !
        </h1>
        <p style={{ fontSize: 15, color: C.textSec, lineHeight: 1.6, marginBottom: 28 }}>
          {user
            ? `Bienvenue${user.user_metadata?.full_name ? " " + user.user_metadata.full_name : ""} ! Votre compte est actif.`
            : "Votre adresse email a bien été vérifiée. Vous pouvez maintenant vous connecter."}
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {user ? (
            <>
              <Link href="/compte" style={{ padding: "12px 24px", borderRadius: 10, background: C.gradient, color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none", display: "inline-block" }}>
                Mon compte
              </Link>
              <Link href="/catalogue" style={{ padding: "12px 24px", borderRadius: 10, background: C.surface, border: "1.5px solid " + C.border, color: C.text, fontWeight: 600, fontSize: 14, textDecoration: "none", display: "inline-block" }}>
                Explorer les formations
              </Link>
            </>
          ) : (
            <Link href="/?auth=1" style={{ padding: "12px 24px", borderRadius: 10, background: C.gradient, color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none", display: "inline-block" }}>
              Se connecter
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
