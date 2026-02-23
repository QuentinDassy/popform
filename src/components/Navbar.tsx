"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PopcornLogo } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import AuthModal from "@/components/AuthModal";
import { supabase } from "@/lib/supabase-data";

const C = {
  bg: "#FFFDF7", bgAlt: "#FFF8EC", border: "#F0E4CC", borderLight: "#F5EDD8",
  text: "#2D1B06", textTer: "#A48C6A", accent: "#D42B2B",
  accentBg: "rgba(212,43,43,0.07)", surface: "#FFFFFF",
  gradient: "linear-gradient(135deg, #D42B2B, #E84545, #F5B731)",
  yellow: "#F5B731", yellowBg: "rgba(245,183,49,0.1)", yellowDark: "#D49A1A",
};

const NAV_ITEMS = [
  { href: "/", label: "Accueil", icon: "🏠" },
  { href: "/catalogue", label: "Catalogue", icon: "🎬" },
  { href: "/villes", label: "Villes", icon: "📍" },
  { href: "/organismes", label: "Organismes", icon: "🏢" },
  { href: "/formateurs", label: "Formateur·rice·s", icon: "🎤" },
];

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => { const c = () => setM(window.innerWidth < 768); c(); window.addEventListener("resize", c); return () => window.removeEventListener("resize", c) }, []);
  return m;
}

export default function Navbar() {
  const pathname = usePathname();
  const { user, profile, signOut, showAuth, setShowAuth } = useAuth();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [menuOpen, setMenuOpen] = useState(false);
  const mob = useIsMobile();

  const [unreadCount, setUnreadCount] = useState(0);
  const openLogin = () => { setAuthMode("login"); setShowAuth(true) };
  const openRegister = () => { setAuthMode("register"); setShowAuth(true) };

  useEffect(() => { setMenuOpen(false) }, [pathname]);

  useEffect(() => {
    if (user?.email === "quentin.dassy@gmail.com") {
      supabase.from("formations").select("id", { count: "exact", head: true }).eq("status", "en_attente").then(({ count }) => {
        setUnreadCount(count || 0);
      });
    }
  }, [user, pathname]);

  return (
    <>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: mob ? "8px 16px" : "10px 40px", borderBottom: "1px solid " + C.borderLight, position: "sticky", top: 0, zIndex: 50, background: "rgba(255,253,247,0.9)", backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: mob ? 10 : 20 }}>
          <Link href="/" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
            <PopcornLogo size={mob ? 24 : 28} />
            <span style={{ fontSize: mob ? 15 : 17, fontWeight: 800, fontFamily: "'Space Grotesk',sans-serif", color: C.text }}>
              pop<span style={{ background: C.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>form</span>
            </span>
          </Link>
          {!mob && (
            <div style={{ display: "flex", gap: 2 }}>
              {NAV_ITEMS.map(x => (
                <Link key={x.href} href={x.href} style={{ padding: "7px 12px", borderRadius: 8, background: pathname === x.href ? C.accentBg : "transparent", color: pathname === x.href ? C.accent : C.textTer, fontSize: 12.5, fontWeight: 600, textDecoration: "none" }}>
                  {x.label}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {mob ? (
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.text }}>☰</button>
          ) : user ? (
            <>
              {profile?.role === "organisme" && (
                <Link href="/dashboard/organisme" style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid " + C.yellow + "44", background: C.yellowBg, color: C.yellowDark, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>🏢 Dashboard</Link>
              )}
              {profile?.role === "formateur" && (
                <Link href="/dashboard/formateur" style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid " + C.yellow + "44", background: C.yellowBg, color: C.yellowDark, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>🎤 Dashboard</Link>
              )}
              {user?.email === "quentin.dassy@gmail.com" && (
                <Link href="/dashboard/admin" style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid " + C.accent + "44", background: C.accentBg, color: C.accent, fontSize: 12, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, position: "relative" }}>
                  🛡️ Admin
                  {unreadCount > 0 && <span style={{ background: C.accent, color: "#fff", borderRadius: 9999, fontSize: 10, fontWeight: 800, padding: "1px 6px", lineHeight: "16px" }}>{unreadCount}</span>}
                </Link>
              )}
              <Link href="/compte" style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid " + C.border, background: pathname === "/compte" ? C.accentBg : C.surface, color: pathname === "/compte" ? C.accent : C.text, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                👤 {profile?.full_name || "Mon compte"}
              </Link>
              <button onClick={signOut} style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.surface, color: C.textTer, fontSize: 12, cursor: "pointer" }}>Déconnexion</button>
            </>
          ) : (
            <>
              <button onClick={openLogin} style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Se connecter</button>
              <button onClick={openRegister} style={{ padding: "8px 16px", background: C.gradient, border: "none", borderRadius: 9, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>S&apos;inscrire</button>
            </>
          )}
        </div>
      </nav>

      {mob && menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, width: "78%", maxWidth: 300, height: "100%", background: C.bg, padding: 18, boxShadow: "-8px 0 30px rgba(0,0,0,0.1)", overflowY: "auto" }}>
            <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.text, float: "right" }}>✕</button>
            <div style={{ paddingTop: 36, display: "flex", flexDirection: "column", gap: 4 }}>
              {NAV_ITEMS.map(x => (
                <Link key={x.href} href={x.href} style={{ padding: "10px 14px", borderRadius: 9, background: pathname === x.href ? C.accentBg : "transparent", color: pathname === x.href ? C.accent : C.text, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                  {x.icon} {x.label}
                </Link>
              ))}
              {user && (
                <>
                  <hr style={{ border: "none", borderTop: "1px solid " + C.borderLight, margin: "8px 0" }} />
                  {profile?.role === "organisme" && (
                    <Link href="/dashboard/organisme" style={{ padding: "10px 14px", borderRadius: 9, background: pathname.includes("/dashboard") ? C.yellowBg : "transparent", color: pathname.includes("/dashboard") ? C.yellowDark : C.text, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                      Dashboard
                    </Link>
                  )}
                  {profile?.role === "formateur" && (
                    <Link href="/dashboard/formateur" style={{ padding: "10px 14px", borderRadius: 9, background: pathname.includes("/dashboard") ? C.yellowBg : "transparent", color: pathname.includes("/dashboard") ? C.yellowDark : C.text, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                      Dashboard
                    </Link>
                  )}
                  {user?.email === "quentin.dassy@gmail.com" && (
                    <Link href="/dashboard/admin" style={{ padding: "10px 14px", borderRadius: 9, background: pathname.includes("/admin") ? C.accentBg : "transparent", color: pathname.includes("/admin") ? C.accent : C.text, fontSize: 14, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
                      🛡️ Admin
                      {unreadCount > 0 && <span style={{ background: C.accent, color: "#fff", borderRadius: 9999, fontSize: 11, fontWeight: 800, padding: "1px 7px" }}>{unreadCount}</span>}
                    </Link>
                  )}
                  <hr style={{ border: "none", borderTop: "1px solid " + C.borderLight, margin: "6px 0" }} />
                  <Link href="/compte" style={{ padding: "10px 14px", borderRadius: 9, background: pathname === "/compte" ? C.accentBg : "transparent", color: pathname === "/compte" ? C.accent : C.text, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                    Mon compte
                  </Link>
                </>
              )}
              <hr style={{ border: "none", borderTop: "1px solid " + C.borderLight, margin: "6px 0" }} />
              {user ? (
                <button onClick={() => { signOut(); setMenuOpen(false) }} style={{ padding: "10px 14px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.surface, color: C.textTer, fontSize: 13, cursor: "pointer", textAlign: "left" }}>Déconnexion</button>
              ) : (
                <>
                  <button onClick={() => { openLogin(); setMenuOpen(false) }} style={{ padding: "10px 14px", borderRadius: 9, border: "1.5px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Se connecter</button>
                  <button onClick={() => { openRegister(); setMenuOpen(false) }} style={{ padding: "10px 14px", borderRadius: 9, border: "none", background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>S&apos;inscrire</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showAuth && <AuthModal mode={authMode} onClose={() => setShowAuth(false)} onSwitch={() => setAuthMode(m => m === "login" ? "register" : "login")} onSuccess={() => setShowAuth(false)} />}
    </>
  );
}
