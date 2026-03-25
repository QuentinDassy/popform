"use client";
import { useState, useEffect, useRef } from "react";
import { C, getDC, getPhoto } from "@/lib/data";
import { useIsMobile } from "@/lib/hooks";

// ─── Types ───────────────────────────────────────────────────────────────────

export type WizardFormData = {
  titre: string; sous_titre: string; domaines: string[]; modalites: string[];
  description: string; duree: string; effectif: number | null;
  prix: number | null; prix_from: boolean;
  prise_en_charge: string[]; prise_aucune: boolean;
  professions: string[]; mots_cles: string;
  photo_url: string; video_url: string; url_inscription: string;
  lien_elearning: string;
  organisme_ids: number[]; organismes_libres: string[];
  formateur_ids: number[];
};

export type WizardSession = {
  date_debut: string; date_fin: string; modalite: string;
  lieu: string; lien_visio: string;
  organisme_id?: number | null; organisme_libre?: string; url_inscription?: string;
};

export type WizardContext = {
  mode: "formateur" | "organisme" | "admin";
  domainesList: { nom: string; emoji: string }[];
  organismes?: { id: number; nom: string }[];
  formateurs?: { id: number; nom: string }[];
  adminVilles?: string[];
  initialData?: Partial<WizardFormData>;
  initialSessions?: WizardSession[];
};

type FormationWizardProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: WizardFormData, sessions: WizardSession[], photoFile: File | null) => Promise<void>;
  context: WizardContext;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function defaultForm(init?: Partial<WizardFormData>): WizardFormData {
  return {
    titre: "", sous_titre: "", domaines: [], modalites: ["Présentiel"],
    description: "", duree: "", effectif: null,
    prix: null, prix_from: false,
    prise_en_charge: [], prise_aucune: false,
    professions: ["Orthophonie"], mots_cles: "",
    photo_url: "", video_url: "", url_inscription: "",
    lien_elearning: "",
    organisme_ids: [], organismes_libres: [], formateur_ids: [],
    ...init,
  };
}

const STEP_IDS = ["titre", "domaines", "modalites", "description", "prix", "prise", "professions", "organismes", "sessions", "media"] as const;
type StepId = typeof STEP_IDS[number];

const STEP_META: Record<StepId, { title: string; subtitle?: string; optional?: boolean }> = {
  titre:       { title: "Donnez un titre à votre formation",      subtitle: "Ce sera le premier élément vu par les professionnels de santé." },
  domaines:    { title: "Dans quel(s) domaine(s) ?",              subtitle: "Sélectionnez un ou plusieurs domaines." },
  modalites:   { title: "Comment se déroule-t-elle ?",            subtitle: "Choisissez le(s) format(s) de la formation." },
  description: { title: "Décrivez votre formation",               subtitle: "Objectifs, contenu, public visé…" },
  prix:        { title: "Quel est le tarif ?",                    subtitle: "Laissez à 0 si gratuit.", optional: true },
  prise:       { title: "Quelles prises en charge ?",             subtitle: "Sélectionnez les dispositifs acceptés." },
  professions: { title: "À qui s'adresse-t-elle ?",               subtitle: "Définissez les professions ciblées.", optional: true },
  organismes:  { title: "Organisme rattaché",                      subtitle: "Sélectionnez l'organisme de cette formation, ou saisissez un nom libre.", optional: true },
  sessions:    { title: "Ajoutez vos sessions",                   subtitle: "Dates et lieux de la formation.", optional: true },
  media:       { title: "Derniers détails",                       subtitle: "Photo, vidéo et lien d'inscription.", optional: true },
};

const PROFESSIONS = ["Orthophonie", "Ergothérapie", "Psychomotricité", "Kinésithérapie", "Médecine", "Infirmerie", "Autre"];
const PRISES = ["DPC", "FIF-PL"];
const DUREE_PRESETS = ["1h", "3h", "7h", "14h", "21h"];

const MODALITE_CARDS: { id: string; emoji: string; label: string; desc: string }[] = [
  { id: "Présentiel", emoji: "📍", label: "Présentiel", desc: "En salle, en personne" },
  { id: "Visio",      emoji: "💻", label: "Visio",      desc: "À distance en direct" },
  { id: "E-learning", emoji: "📺", label: "E-learning", desc: "En ligne, en autonomie" },
];

function defaultSession(): WizardSession {
  return { date_debut: "", date_fin: "", modalite: "Présentiel", lieu: "", lien_visio: "", organisme_id: null, organisme_libre: "", url_inscription: "" };
}

// ─── Component ───────────────────────────────────────────────────────────────

// see dashboard pages for trigger button style
export default function FormationWizard({ open, onClose, onSubmit, context }: FormationWizardProps) {
  const mob = useIsMobile();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardFormData>(() => defaultForm(context.initialData));
  const [sessions, setSessions] = useState<WizardSession[]>(context.initialSessions || []);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [showError, setShowError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(true);

  // Session mini-form state
  const [newSession, setNewSession] = useState<WizardSession>(defaultSession());

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setForm(defaultForm(context.initialData));
      setSessions(context.initialSessions || []);
      setPhotoFile(null);
      setStep(0);
      setShowError(false);
      setSubmitting(false);
      setVisible(true);
      setNewSession(defaultSession());
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus on title input
  useEffect(() => {
    if (open && step === 0) {
      setTimeout(() => titleInputRef.current?.focus(), 200);
    }
  }, [open, step]);

  if (!open) return null;

  // ── Computed step list ────────────────────────────────────────────────────
  const isElearningOnly = form.modalites.length === 1 && form.modalites[0] === "E-learning";
  const activeSteps: StepId[] = STEP_IDS.filter(s => {
    if (s === "sessions" && isElearningOnly) return false;
    if (s === "organismes" && context.mode !== "formateur" && context.mode !== "organisme") return false;
    return true;
  });
  const totalSteps = activeSteps.length;
  const currentStepId = activeSteps[step];
  const meta = STEP_META[currentStepId];
  const isLast = step === totalSteps - 1;

  // ── Validation ───────────────────────────────────────────────────────────
  function canAdvance(): boolean {
    switch (currentStepId) {
      case "titre":       return form.titre.trim().length >= 3;
      case "domaines":    return form.domaines.length >= 1;
      case "modalites":   return form.modalites.length >= 1;
      case "description": return form.description.trim().length >= 20;
      default:            return true;
    }
  }

  // ── Navigation ───────────────────────────────────────────────────────────
  function goNext() {
    if (!canAdvance()) { setShowError(true); return; }
    setShowError(false);
    if (isLast) { handleSubmit(); return; }
    setVisible(false);
    setTimeout(() => { setStep(s => s + 1); setVisible(true); }, 150);
  }

  function goPrev() {
    if (step === 0) return;
    setShowError(false);
    setVisible(false);
    setTimeout(() => { setStep(s => s - 1); setVisible(true); }, 150);
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onSubmit(form, sessions, photoFile);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("Erreur : " + msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Modalites toggle logic ────────────────────────────────────────────────
  function toggleModalite(id: string) {
    const next = form.modalites.includes(id)
      ? form.modalites.filter(m => m !== id)
      : [...form.modalites, id];
    setForm({ ...form, modalites: next });
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    padding: "10px 14px", borderRadius: 10,
    border: "1.5px solid " + C.border,
    background: C.bgAlt, color: C.text, fontSize: 14,
    outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "inherit",
  };
  const chipBase: React.CSSProperties = {
    padding: "8px 14px", borderRadius: 20, border: "1.5px solid " + C.border,
    background: C.surface, color: C.textSec, fontSize: 13,
    cursor: "pointer", fontWeight: 400, transition: "all 0.1s",
    fontFamily: "inherit",
  };
  const chipSel: React.CSSProperties = {
    ...chipBase,
    border: "1.5px solid " + C.accent + "66",
    background: C.accentBg, color: C.accent, fontWeight: 700,
  };

  // ── Step content ─────────────────────────────────────────────────────────
  function renderStep() {
    switch (currentStepId) {

      // ─── TITRE ──────────────────────────────────────────────────────────
      case "titre":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{ paddingBottom: 20 }}>
              <input
                ref={titleInputRef}
                value={form.titre}
                onChange={e => setForm({ ...form, titre: e.target.value })}
                onKeyDown={e => { if (e.key === "Enter") goNext(); }}
                placeholder="Ex: Prise en charge des TDL chez l'enfant"
                style={{
                  ...inputStyle,
                  fontSize: mob ? 22 : 28,
                  fontWeight: 700,
                  border: "none",
                  borderBottom: "2px solid " + C.border,
                  borderRadius: 0,
                  background: "transparent",
                  padding: "8px 0",
                }}
              />
              {showError && form.titre.trim().length < 3 && (
                <p style={{ color: C.pink, fontSize: 12, marginTop: 6 }}>Le titre doit comporter au moins 3 caractères.</p>
              )}
            </div>
            <div style={{ height: 1, background: C.borderLight, margin: "0 0 20px" }} />
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                Sous-titre <span style={{ fontWeight: 400, textTransform: "none" as const }}>(optionnel)</span>
              </label>
              <input
                value={form.sous_titre}
                onChange={e => setForm({ ...form, sous_titre: e.target.value })}
                onKeyDown={e => { if (e.key === "Enter") goNext(); }}
                placeholder="Ex: Pour les orthophonistes libéraux"
                style={inputStyle}
              />
            </div>
          </div>
        );

      // ─── DOMAINES ───────────────────────────────────────────────────────
      case "domaines": {
        const photos = form.domaines.map(d => getPhoto(d)).filter(Boolean);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {context.domainesList.map(d => {
                const sel = form.domaines.includes(d.nom);
                const dc = getDC(d.nom);
                return (
                  <button
                    key={d.nom}
                    onClick={() => {
                      const next = sel
                        ? form.domaines.filter(x => x !== d.nom)
                        : [...form.domaines, d.nom];
                      setForm({ ...form, domaines: next });
                    }}
                    style={{
                      padding: "9px 16px", borderRadius: 20,
                      border: "1.5px solid " + (sel ? dc.color + "77" : C.border),
                      background: sel ? dc.bg : C.surface,
                      color: sel ? dc.color : C.textSec,
                      fontSize: 13, fontWeight: sel ? 700 : 400,
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.1s",
                    }}
                  >
                    {d.emoji} {d.nom}
                  </button>
                );
              })}
            </div>
            {showError && form.domaines.length === 0 && (
              <p style={{ color: C.pink, fontSize: 12 }}>Sélectionnez au moins un domaine.</p>
            )}
            {photos.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                {photos.slice(0, 3).map((p, i) => (
                  <img key={i} src={p} alt="" style={{ width: 80, height: 52, objectFit: "cover", borderRadius: 8, border: "1.5px solid " + C.borderLight }} />
                ))}
              </div>
            )}
          </div>
        );
      }

      // ─── MODALITES ──────────────────────────────────────────────────────
      case "modalites":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {MODALITE_CARDS.map(m => {
                const sel = form.modalites.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleModalite(m.id)}
                    style={{
                      width: mob ? "calc(50% - 5px)" : 140,
                      padding: "16px 12px",
                      borderRadius: 14,
                      border: "2px solid " + (sel ? C.accent + "66" : C.border),
                      background: sel ? C.accentBg : C.surface,
                      color: sel ? C.accent : C.textSec,
                      cursor: "pointer", textAlign: "center" as const,
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{m.emoji}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: sel ? C.accent : C.text }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: sel ? C.accent : C.textTer }}>{m.desc}</div>
                  </button>
                );
              })}
            </div>
            {isElearningOnly && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: C.blueBg, border: "1.5px solid " + C.blue + "44", display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 16 }}>ℹ️</span>
                <span style={{ fontSize: 13, color: C.blue }}>Pas de session requise pour une formation e-learning.</span>
              </div>
            )}
            {form.modalites.includes("E-learning") && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                  📺 Lien E-learning <span style={{ fontWeight: 400, textTransform: "none" as const }}>(optionnel)</span>
                </label>
                <input
                  value={form.lien_elearning}
                  onChange={e => setForm({ ...form, lien_elearning: e.target.value })}
                  placeholder="https://… (lien vers le contenu en ligne)"
                  style={inputStyle}
                />
              </div>
            )}
            {form.modalites.includes("E-learning") && (
              <div style={{ padding: "10px 14px", background: "#EFF6FF", borderRadius: 10, border: "1px solid #BFDBFE", fontSize: 12, color: "#1D4ED8", lineHeight: 1.5 }}>
                💡 Vous pouvez créer une formation e-learning avec des sessions (visio ou présentiel) ou séparer en deux formations distinctes.
              </div>
            )}
            {showError && form.modalites.length === 0 && (
              <p style={{ color: C.pink, fontSize: 12 }}>Sélectionnez au moins une modalité.</p>
            )}
          </div>
        );

      // ─── DESCRIPTION ────────────────────────────────────────────────────
      case "description":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{ paddingBottom: 16 }}>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Décrivez les objectifs pédagogiques, le contenu, les prérequis, le public visé…"
                style={{ ...inputStyle, minHeight: 140, resize: "vertical" as const }}
              />
              {showError && form.description.trim().length < 20 && (
                <p style={{ color: C.pink, fontSize: 12, marginTop: 4 }}>La description doit comporter au moins 20 caractères.</p>
              )}
            </div>
            <div style={{ height: 1, background: C.borderLight, margin: "0 0 16px" }} />
            <div style={{ paddingBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                Durée <span style={{ fontWeight: 400, textTransform: "none" as const }}>(optionnel)</span>
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {DUREE_PRESETS.map(d => (
                  <button
                    key={d}
                    onClick={() => setForm({ ...form, duree: form.duree === d ? "" : d })}
                    style={form.duree === d ? chipSel : chipBase}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <input
                value={DUREE_PRESETS.includes(form.duree) ? "" : form.duree}
                onChange={e => setForm({ ...form, duree: e.target.value })}
                placeholder="Ou saisir une durée personnalisée…"
                style={{ ...inputStyle, fontSize: 13 }}
              />
            </div>
            <div style={{ height: 1, background: C.borderLight, margin: "0 0 16px" }} />
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                Effectif maximum <span style={{ fontWeight: 400, textTransform: "none" as const }}>(optionnel)</span>
              </label>
              <input
                type="number" min="1"
                value={form.effectif ?? ""}
                onChange={e => setForm({ ...form, effectif: e.target.value ? Number(e.target.value) : null })}
                placeholder="Ex: 20"
                style={{ ...inputStyle, maxWidth: 160 }}
              />
            </div>
          </div>
        );

      // ─── PRIX ───────────────────────────────────────────────────────────
      case "prix":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13 }}>
              <input
                type="checkbox"
                checked={form.prix === 0}
                onChange={e => setForm({ ...form, prix: e.target.checked ? 0 : null })}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <span style={{ fontWeight: 700, color: form.prix === 0 ? "#16A34A" : C.textSec }}>Gratuit</span>
            </label>
            {form.prix !== 0 && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>Prix (€)</label>
                <input
                  type="number" min="0"
                  value={form.prix ?? ""}
                  onChange={e => setForm({ ...form, prix: e.target.value !== "" ? Number(e.target.value) : null })}
                  placeholder="Ex: 450"
                  style={{ ...inputStyle, fontSize: mob ? 22 : 28, fontWeight: 700, maxWidth: 200 }}
                />
              </div>
            )}
            {form.prix !== 0 && (
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: C.textSec }}>
                <input
                  type="checkbox"
                  checked={form.prix_from}
                  onChange={e => setForm({ ...form, prix_from: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                Prix "à partir de" (afficher comme un minimum)
              </label>
            )}
          </div>
        );

      // ─── PRISE EN CHARGE ────────────────────────────────────────────────
      case "prise":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PRISES.map(p => {
                const sel = form.prise_en_charge.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => {
                      if (form.prise_aucune) return;
                      const next = sel
                        ? form.prise_en_charge.filter(x => x !== p)
                        : [...form.prise_en_charge, p];
                      setForm({ ...form, prise_en_charge: next });
                    }}
                    style={sel ? chipSel : { ...chipBase, opacity: form.prise_aucune ? 0.4 : 1 }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: C.textSec }}>
              <input
                type="checkbox"
                checked={form.prise_aucune}
                onChange={e => {
                  setForm({ ...form, prise_aucune: e.target.checked, prise_en_charge: e.target.checked ? [] : form.prise_en_charge });
                }}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              Aucune prise en charge
            </label>
          </div>
        );

      // ─── PROFESSIONS ────────────────────────────────────────────────────
      case "professions":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{ paddingBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>Professions ciblées</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PROFESSIONS.map(p => {
                  const sel = form.professions.includes(p);
                  return (
                    <button key={p} onClick={() => {
                      const next = sel ? form.professions.filter(x => x !== p) : [...form.professions, p];
                      setForm({ ...form, professions: next });
                    }} style={sel ? { ...chipSel, border: "1.5px solid " + C.green + "66", background: C.greenBg, color: C.green } : chipBase}>{p}</button>
                  );
                })}
              </div>
            </div>
            <div style={{ height: 1, background: C.borderLight, margin: "0 0 20px" }} />
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Mots-clés</label>
              <input
                value={form.mots_cles}
                onChange={e => setForm({ ...form, mots_cles: e.target.value })}
                placeholder="Ex: bégaiement, enfant, TDA"
                style={inputStyle}
              />
              <p style={{ fontSize: 11, color: C.textTer, marginTop: 4 }}>Séparez les mots-clés par des virgules.</p>
            </div>
          </div>
        );

      // ─── ORGANISMES ─────────────────────────────────────────────────────
      case "organismes":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <select
              style={{ ...inputStyle }}
              value={form.organisme_ids[0] != null ? String(form.organisme_ids[0]) : (form.organismes_libres[0] ? "__libre__" : "")}
              onChange={e => {
                if (e.target.value === "") setForm({ ...form, organisme_ids: [], organismes_libres: [] });
                else if (e.target.value === "__libre__") setForm({ ...form, organisme_ids: [], organismes_libres: [form.organismes_libres[0] || " "] });
                else setForm({ ...form, organisme_ids: [Number(e.target.value)], organismes_libres: [] });
              }}
            >
              <option value="">— Aucun organisme —</option>
              {(context.organismes || []).map(o => (
                <option key={o.id} value={o.id}>{o.nom}</option>
              ))}
              <option value="__libre__">✏️ Personnalisé…</option>
            </select>
            {form.organisme_ids.length === 0 && form.organismes_libres.length > 0 && (
              <input
                value={form.organismes_libres[0]?.trim() || ""}
                onChange={e => setForm({ ...form, organismes_libres: [e.target.value || " "] })}
                placeholder="Nom de l'organisme…"
                style={{ ...inputStyle, fontSize: 13 }}
              />
            )}
          </div>
        );

      // ─── SESSIONS ───────────────────────────────────────────────────────
      case "sessions": {
        // All organismes available for session assignment
        const allSessionOrgs: { label: string; orgId?: number; libreVal?: string }[] = [
          ...(form.organisme_ids.map(oid => {
            const org = (context.organismes || []).find(o => o.id === oid);
            return org ? { label: org.nom, orgId: oid } : null;
          }).filter(Boolean) as { label: string; orgId: number }[]),
          ...form.organismes_libres.map(ol => ({ label: ol, libreVal: ol })),
        ];

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Mini add form */}
            <div style={{ padding: "16px", background: C.bgAlt, borderRadius: 12, border: "1.5px solid " + C.borderLight, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Date de début</label>
                  <input type="date" value={newSession.date_debut} onChange={e => setNewSession({ ...newSession, date_debut: e.target.value })} style={{ ...inputStyle, fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                    Date de fin <span style={{ fontWeight: 400, textTransform: "none" as const }}>(optionnel)</span>
                  </label>
                  <input type="date" value={newSession.date_fin} min={newSession.date_debut} onChange={e => setNewSession({ ...newSession, date_fin: e.target.value })} style={{ ...inputStyle, fontSize: 13 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Modalité</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {["Présentiel", "Visio"].map(m => (
                    <button key={m} onClick={() => setNewSession({ ...newSession, modalite: m })}
                      style={newSession.modalite === m ? chipSel : chipBase}>{m}</button>
                  ))}
                </div>
              </div>
              {newSession.modalite !== "Visio" && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Lieu / Ville</label>
                  <input value={newSession.lieu} onChange={e => setNewSession({ ...newSession, lieu: e.target.value })} placeholder="Ex: Paris, Lyon…" style={{ ...inputStyle, fontSize: 13 }} />
                </div>
              )}
              {newSession.modalite === "Visio" && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Lien visio (optionnel)</label>
                  <input value={newSession.lien_visio} onChange={e => setNewSession({ ...newSession, lien_visio: e.target.value })} placeholder="https://zoom.us/j/…" style={{ ...inputStyle, fontSize: 13 }} />
                </div>
              )}
              {/* Organisme selector for session — only if multiple organisms */}
              {allSessionOrgs.length > 1 && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Organisme</label>
                  <select
                    style={{ ...inputStyle, fontSize: 13 }}
                    value={newSession.organisme_id != null ? String(newSession.organisme_id) : (newSession.organisme_libre || "")}
                    onChange={e => {
                      const val = e.target.value;
                      if (!val) {
                        setNewSession({ ...newSession, organisme_id: null, organisme_libre: "" });
                      } else {
                        // Check if it's a numeric ID (from organisme_ids) or a libre string
                        const asNum = Number(val);
                        if (!isNaN(asNum) && form.organisme_ids.includes(asNum)) {
                          setNewSession({ ...newSession, organisme_id: asNum, organisme_libre: "" });
                        } else {
                          setNewSession({ ...newSession, organisme_id: null, organisme_libre: val });
                        }
                      }
                    }}
                  >
                    <option value="">— Aucun organisme —</option>
                    {allSessionOrgs.map((o, i) => (
                      <option key={i} value={o.orgId != null ? String(o.orgId) : o.libreVal}>{o.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {/* URL d'inscription par session */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>
                  URL d&apos;inscription <span style={{ fontWeight: 400, textTransform: "none" as const }}>(optionnel)</span>
                </label>
                <input
                  value={newSession.url_inscription || ""}
                  onChange={e => setNewSession({ ...newSession, url_inscription: e.target.value })}
                  placeholder="https://... (lien vers la session)"
                  style={{ ...inputStyle, fontSize: 13 }}
                />
              </div>
              <button
                onClick={() => {
                  if (!newSession.date_debut) return;
                  setSessions(s => [...s, { ...newSession }]);
                  setNewSession(defaultSession());
                }}
                style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", alignSelf: "flex-start" }}
              >
                + Ajouter
              </button>
            </div>

            {/* Sessions list */}
            {sessions.length === 0 ? (
              <p style={{ fontSize: 13, color: C.textTer, textAlign: "center", padding: "12px 0" }}>
                Aucune session — vous pourrez en ajouter après soumission.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sessions.map((s, i) => {
                  const sessionOrgName = s.organisme_id != null
                    ? (context.organismes || []).find(o => o.id === s.organisme_id)?.nom
                    : s.organisme_libre || null;
                  return (
                    <div key={i} style={{ padding: "10px 14px", background: C.surface, borderRadius: 10, border: "1.5px solid " + C.borderLight, display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                          {s.modalite === "Visio" ? "💻 Visio" : "📍 " + (s.lieu || "Lieu non précisé")}
                          {sessionOrgName && (
                            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: C.accentBg, color: C.accent, border: "1px solid " + C.accent + "33" }}>
                              {sessionOrgName}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: C.textTer }}>
                          {s.date_debut}{s.date_fin ? " → " + s.date_fin : ""}
                        </div>
                      </div>
                      <button
                        onClick={() => setSessions(prev => prev.filter((_, j) => j !== i))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: C.pink, fontSize: 18, padding: "0 4px", fontFamily: "inherit" }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      // ─── MEDIA ──────────────────────────────────────────────────────────
      case "media":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={{ paddingBottom: 18 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                Photo de couverture <span style={{ fontWeight: 400, textTransform: "none" as const }}>(optionnel)</span>
              </label>
              <input
                value={form.photo_url}
                onChange={e => setForm({ ...form, photo_url: e.target.value })}
                placeholder="URL d'image (https://…)"
                style={{ ...inputStyle, marginBottom: 8 }}
              />
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "8px 14px", borderRadius: 10, border: "1.5px solid " + C.border, background: C.surface, fontSize: 12, color: C.textSec, fontFamily: "inherit" }}>
                📁 Choisir un fichier
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={e => { if (e.target.files?.[0]) setPhotoFile(e.target.files[0]); }}
                />
              </label>
              {photoFile && (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <img src={URL.createObjectURL(photoFile)} alt="" style={{ width: 80, height: 52, objectFit: "cover", borderRadius: 8 }} />
                  <span style={{ fontSize: 12, color: C.textTer }}>{photoFile.name}</span>
                  <button onClick={() => setPhotoFile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.pink, fontSize: 16 }}>×</button>
                </div>
              )}
            </div>
            <div style={{ height: 1, background: C.borderLight, margin: "0 0 18px" }} />
            <div style={{ paddingBottom: 18 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                Vidéo YouTube <span style={{ fontWeight: 400, textTransform: "none" as const }}>(optionnel)</span>
              </label>
              <input
                value={form.video_url}
                onChange={e => setForm({ ...form, video_url: e.target.value })}
                placeholder="URL YouTube (https://www.youtube.com/…)"
                style={inputStyle}
              />
            </div>
            <div style={{ height: 1, background: C.borderLight, margin: "0 0 18px" }} />
            <div style={{ paddingBottom: 18 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                URL d&apos;inscription <span style={{ fontWeight: 400, textTransform: "none" as const }}>(optionnel)</span>
              </label>
              <input
                value={form.url_inscription}
                onChange={e => setForm({ ...form, url_inscription: e.target.value })}
                placeholder="https://…"
                style={inputStyle}
              />
            </div>

            {/* Formateur multi-select (organisme mode) */}
            {context.mode === "organisme" && context.formateurs && context.formateurs.length > 0 && (
              <>
                <div style={{ height: 1, background: C.borderLight, margin: "0 0 18px" }} />
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.textTer, textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                    Formateurs associés <span style={{ fontWeight: 400, textTransform: "none" as const }}>(optionnel)</span>
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {context.formateurs.map(f => {
                      const sel = form.formateur_ids.includes(f.id);
                      return (
                        <button key={f.id} onClick={() => {
                          const next = sel ? form.formateur_ids.filter(id => id !== f.id) : [...form.formateur_ids, f.id];
                          setForm({ ...form, formateur_ids: next });
                        }} style={sel ? chipSel : chipBase}>
                          {sel ? "✓ " : ""}{f.nom}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  }

  // ─── Header height for scroll offset ──────────────────────────────────────
  const footerH = 70;
  const progressPct = totalSteps > 1 ? (step / (totalSteps - 1)) * 100 : 100;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: C.bg,
        display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "sticky", top: 0, zIndex: 10,
          background: C.bg,
          borderBottom: "1.5px solid " + C.borderLight,
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto", padding: mob ? "14px 16px 0" : "16px 24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", color: C.textSec, fontSize: 14, padding: 0, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}
            >
              ← Fermer
            </button>
            <span style={{ fontSize: 12, color: C.textTer, fontWeight: 600 }}>
              ✨ Mode guidé &nbsp;·&nbsp; Étape {step + 1} / {totalSteps}
              {meta.optional && <span style={{ marginLeft: 6, color: C.textTer, fontWeight: 400 }}>(optionnel)</span>}
            </span>
          </div>
          <h1 style={{ fontSize: mob ? 18 : 22, fontWeight: 800, color: C.text, margin: 0, marginBottom: 2 }}>{meta.title}</h1>
          {meta.subtitle && <p style={{ fontSize: 13, color: C.textSec, margin: 0, marginBottom: 12 }}>{meta.subtitle}</p>}
        </div>
        {/* Progress bar */}
        <div style={{ height: 3, background: C.borderLight }}>
          <div style={{ height: 3, background: C.gradient, width: progressPct + "%", transition: "width 300ms ease" }} />
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          maxWidth: 560, margin: "0 auto", width: "100%",
          padding: mob ? "24px 16px" : "32px 24px",
          paddingBottom: footerH + 24,
          opacity: visible ? 1 : 0,
          transform: visible ? "none" : "translateY(8px)",
          transition: "opacity 150ms ease, transform 150ms ease",
        }}
      >
        {renderStep()}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "sticky", bottom: 0, zIndex: 10,
          background: C.bg,
          borderTop: "1.5px solid " + C.borderLight,
          padding: mob ? "12px 16px" : "14px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 10,
        }}
      >
        <button
          onClick={goPrev}
          style={{
            padding: "10px 20px", borderRadius: 10,
            border: "1.5px solid " + C.border,
            background: C.surface, color: C.textSec, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit",
            opacity: step === 0 ? 0 : 1,
            pointerEvents: step === 0 ? "none" : "auto",
          }}
        >
          ← Précédent
        </button>

        <span style={{ fontSize: 13, color: C.textTer, fontWeight: 600 }}>{step + 1} / {totalSteps}</span>

        <button
          onClick={goNext}
          disabled={submitting}
          style={{
            padding: "10px 24px", borderRadius: 10,
            border: "none",
            background: C.gradient, color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: submitting || !canAdvance() ? "not-allowed" : "pointer",
            opacity: !canAdvance() ? 0.5 : submitting ? 0.7 : 1,
            fontFamily: "inherit",
            transition: "opacity 0.15s",
          }}
        >
          {submitting ? "⏳ Soumission..." : isLast ? "✅ Soumettre" : "Suivant →"}
        </button>
      </div>
    </div>
  );
}
