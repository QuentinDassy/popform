"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { C } from "@/lib/constants";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // Handle hash fragment tokens (email confirm, password reset)
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const type = params.get("type");

      if (hash && hash.includes("access_token")) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const tokenType = hashParams.get("type");
        if (tokenType === "recovery") {
          // Password reset — redirect to reset-password with the hash
          router.replace("/reset-password" + window.location.hash);
          return;
        }
        // Email confirmation — set session and go home
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        if (accessToken && refreshToken) {
          supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(() => {
            router.replace("/");
          });
          return;
        }
      }

      if (code) {
        supabase.auth.exchangeCodeForSession(code).then(({ data }) => {
          if (type === "recovery") {
            router.replace("/reset-password");
          } else {
            router.replace("/");
          }
        });
        return;
      }

      // Fallback
      setTimeout(() => router.replace("/"), 3000);
    }
  }, [router]);

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🍿</div>
        <p style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Vérification en cours...</p>
        <p style={{ fontSize: 13, color: C.textTer, marginTop: 6 }}>Vous allez être redirigé.</p>
      </div>
    </div>
  );
}
