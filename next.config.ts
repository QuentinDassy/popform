import type { NextConfig } from "next";

const securityHeaders = [
  // Empêche le clickjacking (iframes) — SAMEORIGIN permet l'intégration sur votre propre domaine
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Empêche le browser de deviner le type MIME (attaque de sniffing)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Politique de referrer — ne transmet que l'origine (pas le chemin complet) aux sites tiers
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Force HTTPS pour 2 ans sur le domaine et ses sous-domaines
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Préfetch DNS activé (performance)
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Désactive les fonctionnalités sensibles du navigateur non nécessaires
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Empêche XSS en mode compatibilité (navigateurs anciens)
  { key: "X-XSS-Protection", value: "1; mode=block" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
