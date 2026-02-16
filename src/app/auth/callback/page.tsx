"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { C } from "@/lib/constants";
import { Suspense } from "react";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const code = searchParams.get("code");
    const type = searchParams.get("type");

    // Handle hash fragment tokens (older Supabase flow)
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const tokenType = hashParams.get("type");
        if (tokenType === "recovery") {
          router.replace("/reset-password" + window.location.hash);
          return;
        }
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        if (accessToken && refreshToken) {
          supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(() => {
            router.replace("/");
          });
          return;
        }
      }
    }

    // Handle PKCE code flow
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then((result: { data: unknown; error: Error | null }) => {
        if (result.error) {
          setError("Lien invalide ou expiré. Demandez un nouveau lien.");
          return;
        }
        if (type === "recovery") {
          window.location.href = "/reset-password";
        } else {
          window.location.href = "/";
        }
      });
      return;
    }

    // No code, no hash — fallback
    setTimeout(() => { window.location.href = "/"; }, 2000);
  }, [router, searchParams]);

  if (error) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>{error}</p>
        <button onClick={() => router.push("/")} style={{ marginTop: 12, padding: "10px 24px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Retour à l&apos;accueil</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🍿</div>
        <p style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Vérification en cours...</p>
        <p style={{ fontSize: 13, color: C.textTer, marginTop: 6 }}>Vous allez être redirigé·e.</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (<Suspense fallback={<div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}><p>🍿 Chargement...</p></div>}><CallbackContent /></Suspense>);
}
