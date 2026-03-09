"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { C } from "@/lib/data";
import { supabase } from "@/lib/supabase-data";
import Link from "next/link";
import * as XLSX from "xlsx";

// ─── Types Excel parsés ───────────────────────────────────────────────────────

type ExcelFormation = {
  titre: string;
  sous_titre?: string;
  description?: string;
  domaine?: string;
  domaines?: string;        // séparés par ";"
  modalite?: string;
  prise_en_charge?: string; // séparés par ";"
  duree?: string;
  formateur_nom?: string;
  organisme_nom?: string;
  prix?: number;
  prix_salarie?: number | null;
  prix_liberal?: number | null;
  prix_dpc?: number | null;
  populations?: string;     // séparés par ";"
  mots_cles?: string;       // séparés par ";"
  professions?: string;     // séparés par ";"
  effectif?: number;
  url_inscription?: string;
  sans_limite?: string;     // "OUI" / "NON"
  status?: string;          // "publiee" / "en_attente"
};

type ExcelSession = {
  formation_titre: string;
  dates?: string;
  lieu?: string;
  adresse?: string;
  code_postal?: string;
  modalite_session?: string;
  lien_visio?: string;
};

type ExcelSessionPartie = {
  formation_titre: string;
  session_index: number; // 1-based parmi les sessions de cette formation
  titre?: string;
  date_debut?: string;
  date_fin?: string;
  modalite?: string;
  lieu?: string;
  adresse?: string;
  lien_visio?: string;
};

type ParsedData = {
  formations: ExcelFormation[];
  sessions: ExcelSession[];
  session_parties: ExcelSessionPartie[];
};

type ImportResult = {
  formations_ok: number;
  formations_err: { row: number; titre: string; error: string }[];
  sessions_ok: number;
  sessions_err: { row: number; formation: string; error: string }[];
  parties_ok: number;
  parties_err: { row: number; formation: string; error: string }[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function splitSemi(val: string | undefined): string[] {
  if (!val) return [];
  return val.split(";").map(s => s.trim()).filter(Boolean);
}

function toNum(val: unknown): number | null {
  if (val === undefined || val === null || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function sheetToRows(ws: XLSX.WorkSheet): Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}

// Normalise les clés en minuscules sans espaces
function normalizeRow(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k.trim().toLowerCase().replace(/\s+/g, "_")] = String(v ?? "").trim();
  }
  return out;
}

// ─── Parser Excel ─────────────────────────────────────────────────────────────

function parseExcel(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array" });

        const getSheet = (names: string[]) => {
          for (const n of names) {
            const found = wb.SheetNames.find(s => s.toLowerCase() === n.toLowerCase());
            if (found) return wb.Sheets[found];
          }
          return null;
        };

        // Sheet formations
        const wsF = getSheet(["formations", "formation"]);
        const formations: ExcelFormation[] = wsF
          ? sheetToRows(wsF).map(r => {
              const row = normalizeRow(r as Record<string, unknown>);
              return {
                titre: row.titre || "",
                sous_titre: row.sous_titre,
                description: row.description,
                domaine: row.domaine,
                domaines: row.domaines,
                modalite: row.modalite,
                prise_en_charge: row.prise_en_charge,
                duree: row.duree,
                formateur_nom: row.formateur_nom,
                organisme_nom: row.organisme_nom,
                prix: toNum(row.prix) ?? 0,
                prix_salarie: toNum(row.prix_salarie),
                prix_liberal: toNum(row.prix_liberal),
                prix_dpc: toNum(row.prix_dpc),
                populations: row.populations,
                mots_cles: row.mots_cles,
                professions: row.professions,
                effectif: toNum(row.effectif) ?? 0,
                url_inscription: row.url_inscription,
                sans_limite: row.sans_limite,
                status: row.status || "publiee",
              };
            }).filter(f => f.titre)
          : [];

        // Sheet sessions
        const wsS = getSheet(["sessions", "session"]);
        const sessions: ExcelSession[] = wsS
          ? sheetToRows(wsS).map(r => {
              const row = normalizeRow(r as Record<string, unknown>);
              return {
                formation_titre: row.formation_titre || "",
                dates: row.dates,
                lieu: row.lieu,
                adresse: row.adresse,
                code_postal: row.code_postal,
                modalite_session: row.modalite_session,
                lien_visio: row.lien_visio,
              };
            }).filter(s => s.formation_titre)
          : [];

        // Sheet session_parties
        const wsP = getSheet(["session_parties", "parties", "session_parties"]);
        const session_parties: ExcelSessionPartie[] = wsP
          ? sheetToRows(wsP).map(r => {
              const row = normalizeRow(r as Record<string, unknown>);
              return {
                formation_titre: row.formation_titre || "",
                session_index: parseInt(row.session_index) || 1,
                titre: row.titre,
                date_debut: row.date_debut,
                date_fin: row.date_fin,
                modalite: row.modalite,
                lieu: row.lieu,
                adresse: row.adresse,
                lien_visio: row.lien_visio,
              };
            }).filter(p => p.formation_titre)
          : [];

        resolve({ formations, sessions, session_parties });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Erreur de lecture du fichier"));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Génération du template ───────────────────────────────────────────────────

function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  const formations = [
    ["titre", "sous_titre", "description", "domaine", "domaines", "modalite", "prise_en_charge", "duree", "formateur_nom", "organisme_nom", "prix", "prix_salarie", "prix_liberal", "prix_dpc", "populations", "mots_cles", "professions", "effectif", "url_inscription", "sans_limite", "status"],
    ["Formation exemple", "Sous-titre exemple", "Description complète de la formation...", "Langage oral", "Langage oral;Neurologie", "Présentiel", "DPC;FIFPL", "2 jours (14h)", "Dupont Marie", "Mon Organisme", 350, 350, 200, 0, "Enfants;Adultes", "dyslexie;bilan", "Orthophonistes", 15, "https://mon-site.fr/inscription", "NON", "publiee"],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(formations), "formations");

  const sessions = [
    ["formation_titre", "dates", "lieu", "adresse", "code_postal", "modalite_session", "lien_visio"],
    ["Formation exemple", "15-16 mars 2025", "Paris", "10 rue de la Paix", "75001", "Présentiel", ""],
    ["Formation exemple", "20-21 juin 2025", "Lyon", "5 place Bellecour", "69002", "Présentiel", ""],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sessions), "sessions");

  const parties = [
    ["formation_titre", "session_index", "titre", "date_debut", "date_fin", "modalite", "lieu", "adresse", "lien_visio"],
    ["Formation exemple", 1, "Jour 1 - Théorie", "2025-03-15", "2025-03-15", "Présentiel", "Paris", "10 rue de la Paix", ""],
    ["Formation exemple", 1, "Jour 2 - Pratique", "2025-03-16", "2025-03-16", "Présentiel", "Paris", "10 rue de la Paix", ""],
    ["Formation exemple", 2, "Jour 1 - Théorie", "2025-06-20", "2025-06-20", "Présentiel", "Lyon", "5 place Bellecour", ""],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(parties), "session_parties");

  XLSX.writeFile(wb, "template_import_formations.xlsx");
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ImportFormationsPage() {
  const { profile, loading: authLoading } = useAuth();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  if (authLoading) return <div style={{ padding: 40, color: C.textSec }}>Chargement...</div>;
  if (!profile || profile.role !== "admin") {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: C.accent }}>Accès réservé aux administrateurs.</p>
        <Link href="/dashboard/admin" style={{ color: C.blue }}>Retour au dashboard</Link>
      </div>
    );
  }

  // ── Handlers fichier ────────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setParsed(null);
    setParseError(null);
    setResult(null);
    setProgress([]);
    try {
      const data = await parseExcel(f);
      setParsed(data);
    } catch (e) {
      setParseError(String(e));
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  // ── Import ─────────────────────────────────────────────────────────────────
  const runImport = async () => {
    if (!parsed) return;
    setImporting(true);
    setProgress([]);
    setResult(null);

    const log = (msg: string) => setProgress(p => [...p, msg]);
    const res: ImportResult = {
      formations_ok: 0,
      formations_err: [],
      sessions_ok: 0,
      sessions_err: [],
      parties_ok: 0,
      parties_err: [],
    };

    try {
      // 1. Charger formateurs et organismes existants
      log("Chargement des formateurs et organismes existants…");
      const { data: existingFormateurs } = await supabase.from("formateurs").select("id, nom");
      const { data: existingOrganismes } = await supabase.from("organismes").select("id, nom");

      const formateurByNom = new Map<string, number>(
        (existingFormateurs || []).map((f: { id: number; nom: string }) => [f.nom.toLowerCase(), f.id])
      );
      const organismeByNom = new Map<string, number>(
        (existingOrganismes || []).map((o: { id: number; nom: string }) => [o.nom.toLowerCase(), o.id])
      );

      // 2. Insérer les formations
      log(`Import de ${parsed.formations.length} formation(s)…`);
      const formationIdByTitre = new Map<string, number>();

      for (let i = 0; i < parsed.formations.length; i++) {
        const f = parsed.formations[i];
        try {
          const formateur_id = f.formateur_nom
            ? (formateurByNom.get(f.formateur_nom.toLowerCase()) ?? null)
            : null;
          const organisme_id = f.organisme_nom
            ? (organismeByNom.get(f.organisme_nom.toLowerCase()) ?? null)
            : null;

          if (f.formateur_nom && formateur_id === null) {
            log(`  ⚠ Formateur "${f.formateur_nom}" non trouvé, formation "${f.titre}" créée sans formateur`);
          }

          const payload = {
            titre: f.titre,
            sous_titre: f.sous_titre || "",
            description: f.description || "",
            domaine: f.domaine || "",
            domaines: splitSemi(f.domaines),
            modalite: f.modalite || "",
            prise_en_charge: splitSemi(f.prise_en_charge),
            duree: f.duree || "",
            formateur_id,
            organisme_id,
            prix: toNum(f.prix) ?? 0,
            prix_salarie: toNum(f.prix_salarie),
            prix_liberal: toNum(f.prix_liberal),
            prix_dpc: toNum(f.prix_dpc),
            populations: splitSemi(f.populations),
            mots_cles: splitSemi(f.mots_cles),
            professions: splitSemi(f.professions),
            effectif: toNum(f.effectif) ?? 0,
            url_inscription: f.url_inscription || "",
            sans_limite: f.sans_limite?.toUpperCase() === "OUI",
            status: f.status || "publiee",
            note: 0,
            nb_avis: 0,
            is_new: true,
            date_ajout: new Date().toISOString(),
            video_url: "",
            date_fin: null,
            affiche_order: null,
          };

          const { data: inserted, error } = await supabase
            .from("formations")
            .insert(payload)
            .select("id")
            .single();

          if (error) throw new Error(error.message);
          formationIdByTitre.set(f.titre, inserted.id);
          res.formations_ok++;
          log(`  ✓ Formation "${f.titre}" (id: ${inserted.id})`);
        } catch (err) {
          res.formations_err.push({ row: i + 2, titre: f.titre, error: String(err) });
          log(`  ✗ Formation "${f.titre}" — ${err}`);
        }
      }

      // 3. Insérer les sessions
      if (parsed.sessions.length > 0) {
        log(`\nImport de ${parsed.sessions.length} session(s)…`);
        // sessions_by_formation_titre[titre] = liste ordonnée des session ids
        const sessionsByFormation = new Map<string, number[]>();

        for (let i = 0; i < parsed.sessions.length; i++) {
          const s = parsed.sessions[i];
          try {
            const formation_id = formationIdByTitre.get(s.formation_titre);
            if (!formation_id) throw new Error(`Formation "${s.formation_titre}" non trouvée (non importée ou titre incorrect)`);

            const { data: inserted, error } = await supabase
              .from("sessions")
              .insert({
                formation_id,
                dates: s.dates || "",
                lieu: s.lieu || "",
                adresse: s.adresse || "",
                code_postal: s.code_postal || null,
                modalite_session: s.modalite_session || null,
                lien_visio: s.lien_visio || null,
              })
              .select("id")
              .single();

            if (error) throw new Error(error.message);
            if (!sessionsByFormation.has(s.formation_titre)) sessionsByFormation.set(s.formation_titre, []);
            sessionsByFormation.get(s.formation_titre)!.push(inserted.id);
            res.sessions_ok++;
            log(`  ✓ Session "${s.formation_titre}" (id: ${inserted.id})`);
          } catch (err) {
            res.sessions_err.push({ row: i + 2, formation: s.formation_titre, error: String(err) });
            log(`  ✗ Session ligne ${i + 2} — ${err}`);
          }
        }

        // 4. Insérer les session_parties
        if (parsed.session_parties.length > 0) {
          log(`\nImport de ${parsed.session_parties.length} partie(s) de session…`);

          for (let i = 0; i < parsed.session_parties.length; i++) {
            const p = parsed.session_parties[i];
            try {
              const sessionIds = sessionsByFormation.get(p.formation_titre);
              if (!sessionIds || sessionIds.length === 0) throw new Error(`Aucune session trouvée pour "${p.formation_titre}"`);
              const sessionId = sessionIds[p.session_index - 1];
              if (!sessionId) throw new Error(`session_index ${p.session_index} inexistant pour "${p.formation_titre}" (${sessionIds.length} session(s) disponible(s))`);

              const { error } = await supabase.from("session_parties").insert({
                session_id: sessionId,
                titre: p.titre || "",
                date_debut: p.date_debut || "",
                date_fin: p.date_fin || "",
                modalite: p.modalite || "",
                lieu: p.lieu || "",
                adresse: p.adresse || "",
                lien_visio: p.lien_visio || "",
              });

              if (error) throw new Error(error.message);
              res.parties_ok++;
              log(`  ✓ Partie "${p.titre}" (session #${p.session_index} de "${p.formation_titre}")`);
            } catch (err) {
              res.parties_err.push({ row: i + 2, formation: p.formation_titre, error: String(err) });
              log(`  ✗ Partie ligne ${i + 2} — ${err}`);
            }
          }
        }
      }

      log("\nImport terminé !");
    } catch (e) {
      log(`Erreur inattendue : ${e}`);
    } finally {
      setImporting(false);
      setResult(res);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const totalErrors =
    (result?.formations_err.length ?? 0) +
    (result?.sessions_err.length ?? 0) +
    (result?.parties_err.length ?? 0);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "32px 16px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <Link href="/dashboard/admin" style={{ color: C.textSec, fontSize: 14, textDecoration: "none" }}>
            ← Dashboard admin
          </Link>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 6 }}>
          Import Excel — Formations
        </h1>
        <p style={{ color: C.textSec, marginBottom: 28, fontSize: 15 }}>
          Importez plusieurs formations d&apos;un coup depuis un fichier Excel (.xlsx).
          Les formations, sessions et parties de session seront créées automatiquement.
        </p>

        {/* Template download */}
        <div style={{
          background: C.blueBg, border: `1px solid ${C.blue}30`, borderRadius: 10,
          padding: "14px 18px", marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap"
        }}>
          <div>
            <div style={{ fontWeight: 600, color: C.blue, marginBottom: 3, fontSize: 14 }}>Télécharger le template Excel</div>
            <div style={{ fontSize: 13, color: C.textSec }}>
              3 onglets : <strong>formations</strong>, <strong>sessions</strong>, <strong>session_parties</strong> — avec exemples pré-remplis
            </div>
          </div>
          <button
            onClick={downloadTemplate}
            style={{
              background: C.blue, color: "#fff", border: "none", borderRadius: 8,
              padding: "8px 18px", cursor: "pointer", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap"
            }}
          >
            ⬇ Template
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? C.blue : C.border}`,
            borderRadius: 12,
            padding: "40px 24px",
            textAlign: "center",
            cursor: "pointer",
            background: dragging ? C.blueBg : C.surface,
            transition: "all 0.15s",
            marginBottom: 24,
          }}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={onInputChange} />
          <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
          {file ? (
            <div>
              <div style={{ fontWeight: 600, color: C.text }}>{file.name}</div>
              <div style={{ color: C.textSec, fontSize: 13, marginTop: 4 }}>Cliquez pour changer de fichier</div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 600, color: C.textSec }}>Déposez votre fichier Excel ici</div>
              <div style={{ color: C.textTer, fontSize: 13, marginTop: 4 }}>ou cliquez pour parcourir (.xlsx)</div>
            </div>
          )}
        </div>

        {/* Erreur de parsing */}
        {parseError && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "14px 18px", marginBottom: 20, color: C.accent }}>
            <strong>Erreur de lecture :</strong> {parseError}
          </div>
        )}

        {/* Preview */}
        {parsed && !parseError && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 16 }}>Aperçu du fichier</h2>

            <PreviewSection
              title={`Formations (${parsed.formations.length})`}
              rows={parsed.formations}
              cols={["titre", "domaine", "modalite", "formateur_nom", "prix", "status"]}
            />

            {parsed.sessions.length > 0 && (
              <PreviewSection
                title={`Sessions (${parsed.sessions.length})`}
                rows={parsed.sessions}
                cols={["formation_titre", "dates", "lieu", "modalite_session"]}
              />
            )}

            {parsed.session_parties.length > 0 && (
              <PreviewSection
                title={`Parties de session (${parsed.session_parties.length})`}
                rows={parsed.session_parties}
                cols={["formation_titre", "session_index", "titre", "date_debut", "date_fin"]}
              />
            )}

            {/* Bouton import */}
            {!result && (
              <button
                onClick={runImport}
                disabled={importing || parsed.formations.length === 0}
                style={{
                  background: importing ? C.border : C.accent,
                  color: importing ? C.textSec : "#fff",
                  border: "none", borderRadius: 10,
                  padding: "12px 32px", fontSize: 16, fontWeight: 700,
                  cursor: importing ? "not-allowed" : "pointer",
                  marginTop: 8, transition: "all 0.15s",
                }}
              >
                {importing ? "Import en cours…" : `Importer ${parsed.formations.length} formation(s)`}
              </button>
            )}
          </div>
        )}

        {/* Log de progression */}
        {progress.length > 0 && (
          <div style={{
            background: "#0F172A", borderRadius: 10, padding: "16px 20px",
            fontFamily: "monospace", fontSize: 13, color: "#E2E8F0",
            maxHeight: 320, overflowY: "auto", marginBottom: 24,
            lineHeight: 1.7,
          }}>
            {progress.map((line, i) => (
              <div key={i} style={{
                color: line.startsWith("  ✓") ? "#4ADE80"
                  : line.startsWith("  ✗") ? "#F87171"
                  : line.startsWith("  ⚠") ? "#FACC15"
                  : "#E2E8F0"
              }}>
                {line || "\u00A0"}
              </div>
            ))}
          </div>
        )}

        {/* Résultat final */}
        {result && (
          <div style={{
            background: totalErrors === 0 ? C.greenBg : "#FFF7ED",
            border: `1px solid ${totalErrors === 0 ? C.green : "#FED7AA"}`,
            borderRadius: 12, padding: "20px 24px", marginBottom: 24,
          }}>
            <h3 style={{ fontWeight: 700, color: totalErrors === 0 ? C.green : C.orange, marginBottom: 12, fontSize: 16 }}>
              {totalErrors === 0 ? "✓ Import réussi !" : `Import terminé avec ${totalErrors} erreur(s)`}
            </h3>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 14 }}>
              <Stat label="Formations" ok={result.formations_ok} err={result.formations_err.length} />
              <Stat label="Sessions" ok={result.sessions_ok} err={result.sessions_err.length} />
              <Stat label="Parties" ok={result.parties_ok} err={result.parties_err.length} />
            </div>

            {/* Détail des erreurs */}
            {totalErrors > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 600, color: C.accent, marginBottom: 8, fontSize: 14 }}>Détail des erreurs :</div>
                {[...result.formations_err, ...result.sessions_err, ...result.parties_err].map((e, i) => (
                  <div key={i} style={{ fontSize: 13, color: C.text, marginBottom: 4, paddingLeft: 12 }}>
                    • Ligne {e.row} — {"titre" in e ? e.titre : e.formation} : <span style={{ color: C.accent }}>{e.error}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/dashboard/admin" style={{
                background: C.accent, color: "#fff", textDecoration: "none",
                borderRadius: 8, padding: "8px 20px", fontSize: 14, fontWeight: 600,
              }}>
                Voir le dashboard
              </Link>
              <button
                onClick={() => { setFile(null); setParsed(null); setResult(null); setProgress([]); }}
                style={{
                  background: "transparent", color: C.textSec, border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: "8px 20px", fontSize: 14, cursor: "pointer",
                }}
              >
                Nouvel import
              </button>
            </div>
          </div>
        )}

        {/* Guide colonnes */}
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer", color: C.textSec, fontSize: 14, userSelect: "none", marginBottom: 12 }}>
            Guide des colonnes Excel
          </summary>
          <ColGuide />
        </details>
      </div>
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function PreviewSection({
  title, rows, cols,
}: {
  title: string;
  rows: Record<string, unknown>[];
  cols: string[];
}) {
  const preview = rows.slice(0, 5);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 600, color: C.text, marginBottom: 8, fontSize: 14 }}>
        {title}
        {rows.length > 5 && <span style={{ color: C.textSec, fontWeight: 400 }}> (aperçu des 5 premières)</span>}
      </div>
      <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${C.border}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.bgAlt }}>
              {cols.map(c => (
                <th key={c} style={{ padding: "8px 12px", textAlign: "left", color: C.textSec, fontWeight: 600, whiteSpace: "nowrap", borderBottom: `1px solid ${C.border}` }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i} style={{ borderBottom: i < preview.length - 1 ? `1px solid ${C.borderLight}` : "none" }}>
                {cols.map(c => (
                  <td key={c} style={{ padding: "7px 12px", color: C.text, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {String(row[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, ok, err }: { label: string; ok: number; err: number }) {
  return (
    <div>
      <div style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>{label}</div>
      <div style={{ color: C.green, fontSize: 13 }}>{ok} importé(s)</div>
      {err > 0 && <div style={{ color: C.accent, fontSize: 13 }}>{err} erreur(s)</div>}
    </div>
  );
}

function ColGuide() {
  const sections = [
    {
      title: "Onglet formations",
      cols: [
        ["titre", "Obligatoire", "Titre de la formation"],
        ["sous_titre", "Optionnel", "Sous-titre"],
        ["description", "Optionnel", "Description longue"],
        ["domaine", "Optionnel", "Domaine principal"],
        ["domaines", "Optionnel", "Plusieurs domaines séparés par ;"],
        ["modalite", "Optionnel", "Présentiel / Distanciel / Mixte"],
        ["prise_en_charge", "Optionnel", "DPC;FIFPL;OPCO (séparés par ;)"],
        ["duree", "Optionnel", "Ex : 2 jours (14h)"],
        ["formateur_nom", "Optionnel", "Nom exact du formateur existant"],
        ["organisme_nom", "Optionnel", "Nom exact de l'organisme existant"],
        ["prix", "Optionnel", "Prix en euros (nombre)"],
        ["prix_salarie", "Optionnel", "Prix salarié"],
        ["prix_liberal", "Optionnel", "Prix libéral"],
        ["prix_dpc", "Optionnel", "Prix DPC"],
        ["populations", "Optionnel", "Enfants;Adultes (séparés par ;)"],
        ["mots_cles", "Optionnel", "dyslexie;bilan (séparés par ;)"],
        ["professions", "Optionnel", "Orthophonistes;Ergothérapeutes"],
        ["effectif", "Optionnel", "Nombre de participants max"],
        ["url_inscription", "Optionnel", "Lien vers le formulaire d'inscription"],
        ["sans_limite", "Optionnel", "OUI ou NON"],
        ["status", "Optionnel", "publiee (défaut) ou en_attente"],
      ]
    },
    {
      title: "Onglet sessions",
      cols: [
        ["formation_titre", "Obligatoire", "Titre exact de la formation (doit correspondre)"],
        ["dates", "Optionnel", "Ex : 15-16 mars 2025"],
        ["lieu", "Optionnel", "Ville"],
        ["adresse", "Optionnel", "Adresse complète"],
        ["code_postal", "Optionnel", "Code postal"],
        ["modalite_session", "Optionnel", "Présentiel / Distanciel"],
        ["lien_visio", "Optionnel", "Lien de la visioconférence"],
      ]
    },
    {
      title: "Onglet session_parties",
      cols: [
        ["formation_titre", "Obligatoire", "Titre exact de la formation"],
        ["session_index", "Obligatoire", "1 = 1ère session de cette formation, 2 = 2ème, etc."],
        ["titre", "Optionnel", "Ex : Jour 1 - Théorie"],
        ["date_debut", "Optionnel", "Format YYYY-MM-DD"],
        ["date_fin", "Optionnel", "Format YYYY-MM-DD"],
        ["modalite", "Optionnel", "Présentiel / Distanciel"],
        ["lieu", "Optionnel", "Ville"],
        ["adresse", "Optionnel", "Adresse"],
        ["lien_visio", "Optionnel", "Lien visio si distanciel"],
      ]
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 4 }}>
      {sections.map(s => (
        <div key={s.title}>
          <div style={{ fontWeight: 700, color: C.text, marginBottom: 8, fontSize: 14 }}>{s.title}</div>
          <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${C.border}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.bgAlt }}>
                  {["Colonne", "Requis", "Description"].map(h => (
                    <th key={h} style={{ padding: "7px 12px", textAlign: "left", color: C.textSec, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.cols.map(([col, req, desc], i) => (
                  <tr key={col} style={{ borderBottom: i < s.cols.length - 1 ? `1px solid ${C.borderLight}` : "none" }}>
                    <td style={{ padding: "6px 12px", fontFamily: "monospace", color: C.blue }}>{col}</td>
                    <td style={{ padding: "6px 12px", color: req === "Obligatoire" ? C.accent : C.textSec }}>{req}</td>
                    <td style={{ padding: "6px 12px", color: C.text }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
