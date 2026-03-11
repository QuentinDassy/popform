"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  { href: "/villes", label: "Villes & Régions", icon: "🗺️" },
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
  const router = useRouter();
  const { user, profile, signOut, showAuth, setShowAuth } = useAuth();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchVilles, setSearchVilles] = useState<string[]>([]);
  const [searchFormateurs, setSearchFormateurs] = useState<{ id: number; nom: string }[]>([]);
  const [searchFormations, setSearchFormations] = useState<{ id: number; titre: string; domaine: string }[]>([]);
  const mob = useIsMobile();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [unreadCount, setUnreadCount] = useState(0);
  const openLogin = () => { setAuthMode("login"); setShowAuth(true) };
  const openRegister = () => { setAuthMode("register"); setShowAuth(true) };

  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [pathname]);

  useEffect(() => {
    if (profile?.role === "admin") {
      supabase.from("formations").select("id", { count: "exact", head: true }).eq("status", "en_attente").then(({ count }: { count: number | null }) => {
        setUnreadCount(count || 0);
      });
    }
  }, [user, pathname]);

  // Fetch data when search panel opens
  useEffect(() => {
    if (!searchOpen) return;
    setTimeout(() => searchInputRef.current?.focus(), 80);
    if (searchVilles.length === 0) {
      supabase.from("villes_admin").select("nom").order("nom").then(({ data }: { data: { nom: string }[] | null }) => {
        if (data) setSearchVilles(data.map(v => v.nom));
      }).catch(() => {});
    }
    if (searchFormateurs.length === 0) {
      supabase.from("formateurs").select("id, nom").order("nom").then(({ data }: { data: { id: number; nom: string }[] | null }) => {
        if (data) setSearchFormateurs(data);
      }).catch(() => {});
    }
    if (searchFormations.length === 0) {
      supabase.from("formations").select("id, titre, domaine").eq("status", "publiee").order("titre").then(({ data }: { data: { id: number; titre: string; domaine: string }[] | null }) => {
        if (data) setSearchFormations(data);
      }).catch(() => {});
    }
  }, [searchOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (q?: string) => {
    const query = (q ?? searchText).trim();
    router.push(query ? "/catalogue?q=" + encodeURIComponent(query) : "/catalogue");
    setSearchOpen(false);
    setSearchText("");
  };

  const handleVilleSearch = (ville: string) => {
    router.push("/catalogue?villes=" + encodeURIComponent(ville));
    setSearchOpen(false);
    setSearchText("");
  };

  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const q = norm(searchText);
  const filteredVilles = q.length >= 1
    ? searchVilles.filter(v => norm(v).includes(q)).slice(0, 4)
    : searchVilles.slice(0, 8);
  const filteredFormateurs = q.length >= 2
    ? searchFormateurs.filter(f => norm(f.nom).includes(q)).slice(0, 3)
    : [];
  const filteredFormations = q.length >= 2
    ? searchFormations.filter(f => norm(f.titre).includes(q) || norm(f.domaine).includes(q)).slice(0, 3)
    : [];

  return (
    <>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: mob ? "8px 16px" : "10px 40px", borderBottom: "1px solid " + C.borderLight, position: "sticky", top: 0, zIndex: 50, background: "rgba(255,253,247,0.9)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", overflow: "hidden" } as React.CSSProperties}>
        <div style={{ display: "flex", alignItems: "center", gap: mob ? 10 : 20 }}>
          <Link href="/" style={{ cursor: "pointer", display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/nouveaulogopopform.png" alt="PopForm" style={{ height: mob ? 28 : 34, width: "auto", display: "block" }} />
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
          {mob ? null : user ? (
            <>
              {profile?.role === "organisme" && (
                <Link href="/dashboard/organisme" style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid " + C.yellow + "44", background: C.yellowBg, color: C.yellowDark, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>🏢 Dashboard</Link>
              )}
              {profile?.role === "formateur" && (
                <Link href="/dashboard/formateur" style={{ padding: "7px 12px", borderRadius: 9, border: "1.5px solid " + C.yellow + "44", background: C.yellowBg, color: C.yellowDark, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>🎤 Dashboard</Link>
              )}
              {profile?.role === "admin" && (
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
                  {profile?.role === "admin" && (
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

      {/* ===== SEARCH PANEL (mobile) ===== */}
      {mob && searchOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, background: C.bg, display: "flex", flexDirection: "column" }}>
          {/* Top bar */}
          <div style={{ padding: "10px 14px", borderBottom: "1px solid " + C.border, display: "flex", gap: 10, alignItems: "center", background: C.surface }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "0 14px", background: C.bgAlt, border: "1.5px solid " + C.accent + "55", borderRadius: 14, height: 46 }}>
              <span style={{ color: C.accent, fontSize: 16 }}>🔍</span>
              <input
                ref={searchInputRef}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="Ville, domaine, formateur..."
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.text, fontSize: 16, fontFamily: "inherit" }}
              />
              {searchText && <button onClick={() => setSearchText("")} style={{ background: "none", border: "none", color: C.textTer, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>}
            </div>
            <button onClick={() => setSearchOpen(false)} style={{ background: "none", border: "none", color: C.accent, fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", padding: "4px 0" }}>Annuler</button>
          </div>

          {/* Results */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>
            {searchText.trim().length >= 1 ? (
              <>
                <button onClick={() => handleSearch()} style={{ width: "100%", padding: "13px 16px", background: C.gradient, border: "none", borderRadius: 13, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 14, textAlign: "left" as const, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }}>🔍</span>
                  <span>Rechercher <strong>&ldquo;{searchText}&rdquo;</strong></span>
                </button>
                {filteredFormateurs.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6 }}>Formateur·rice·s</div>
                    {filteredFormateurs.map(fmt => (
                      <button key={fmt.id} onClick={() => { router.push("/formateurs?id=" + fmt.id); setSearchOpen(false); setSearchText(""); }} style={{ width: "100%", padding: "11px 14px", background: C.surface, border: "1px solid " + C.borderLight, borderRadius: 12, color: C.text, fontSize: 14, cursor: "pointer", marginBottom: 7, textAlign: "left" as const, display: "flex", gap: 12, alignItems: "center" }}>
                        <span style={{ width: 32, height: 32, borderRadius: 16, background: C.accentBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>🎤</span>
                        <span style={{ fontWeight: 600 }}>{fmt.nom}</span>
                      </button>
                    ))}
                  </>
                )}
                {filteredFormations.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6, marginTop: filteredFormateurs.length > 0 ? 10 : 0 }}>Formations</div>
                    {filteredFormations.map(fo => (
                      <button key={fo.id} onClick={() => { router.push("/formation/" + fo.id); setSearchOpen(false); setSearchText(""); }} style={{ width: "100%", padding: "11px 14px", background: C.surface, border: "1px solid " + C.borderLight, borderRadius: 12, color: C.text, fontSize: 13, cursor: "pointer", marginBottom: 7, textAlign: "left" as const, display: "flex", gap: 12, alignItems: "center" }}>
                        <span style={{ width: 32, height: 32, borderRadius: 10, background: C.bgAlt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🎬</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10, color: C.textTer, fontWeight: 600 }}>{fo.domaine}</div>
                          <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{fo.titre}</div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
                {filteredVilles.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6, marginTop: (filteredFormateurs.length > 0 || filteredFormations.length > 0) ? 10 : 0 }}>Villes</div>
                    {filteredVilles.map(ville => (
                      <button key={ville} onClick={() => handleVilleSearch(ville)} style={{ width: "100%", padding: "11px 14px", background: C.surface, border: "1px solid " + C.borderLight, borderRadius: 12, color: C.text, fontSize: 14, cursor: "pointer", marginBottom: 7, textAlign: "left" as const, display: "flex", gap: 12, alignItems: "center" }}>
                        <span style={{ width: 32, height: 32, borderRadius: 10, background: C.bgAlt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>📍</span>
                        <span style={{ fontWeight: 600 }}>{ville}</span>
                      </button>
                    ))}
                  </>
                )}
                {filteredFormateurs.length === 0 && filteredFormations.length === 0 && filteredVilles.length === 0 && (
                  <div style={{ padding: "20px 0", textAlign: "center", color: C.textTer, fontSize: 13 }}>Aucun résultat — essayez le catalogue</div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 12 }}>Suggestions</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {filteredVilles.map(ville => (
                    <button key={ville} onClick={() => handleVilleSearch(ville)} style={{ width: "100%", padding: "12px 16px", background: C.surface, border: "1px solid " + C.borderLight, borderRadius: 12, color: C.text, fontSize: 14, cursor: "pointer", textAlign: "left" as const, display: "flex", gap: 12, alignItems: "center" }}>
                      <span style={{ width: 32, height: 32, borderRadius: 10, background: C.bgAlt, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>📍</span>
                      <div>
                        <div style={{ fontSize: 10, color: C.textTer, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>Ville</div>
                        <div style={{ fontWeight: 700 }}>{ville}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => { router.push("/catalogue"); setSearchOpen(false); }} style={{ width: "100%", marginTop: 20, padding: "14px", background: C.gradient, border: "none", borderRadius: 13, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  Voir tout le catalogue →
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== BOTTOM NAV (mobile) ===== */}
      {mob && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 60, background: "rgba(255,253,247,0.97)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderTop: "1px solid " + C.border, display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
          {/* Accueil */}
          <Link href="/" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, textDecoration: "none", color: pathname === "/" ? C.accent : C.textTer, flexShrink: 0, minWidth: 44 }}>
            <span style={{ fontSize: 20 }}>🏠</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.2 }}>Accueil</span>
          </Link>
          {/* Search tap-to-open (no input = no iOS zoom) */}
          <button onClick={() => setSearchOpen(true)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", background: C.surface, border: "1.5px solid " + C.border, borderRadius: 12, height: 38, cursor: "pointer", fontFamily: "inherit" }}>
            <span style={{ color: C.textTer, fontSize: 14 }}>🔍</span>
            <span style={{ color: C.textTer, fontSize: 13 }}>Rechercher...</span>
          </button>
          {/* Menu */}
          <button onClick={() => setMenuOpen(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, background: "none", border: "none", cursor: "pointer", color: C.textTer, flexShrink: 0, minWidth: 44, padding: 0 }}>
            <span style={{ fontSize: 20 }}>☰</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.2 }}>Menu</span>
          </button>
        </div>
      )}

      {showAuth && <AuthModal mode={authMode} onClose={() => setShowAuth(false)} onSwitch={() => setAuthMode(m => m === "login" ? "register" : "login")} onSuccess={() => setShowAuth(false)} />}
    </>
  );
}
