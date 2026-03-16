-- ============================================================
-- TABLE formation_clicks — suivi des clics "Voir la formation"
-- À exécuter dans Supabase → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS formation_clicks (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  formation_id bigint NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS formation_clicks_formation_id_idx
  ON formation_clicks(formation_id);

CREATE INDEX IF NOT EXISTS formation_clicks_created_at_idx
  ON formation_clicks(created_at);

-- RLS
ALTER TABLE formation_clicks ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut insérer (visiteur anonyme ou connecté)
CREATE POLICY "click_insert" ON formation_clicks
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Seuls les connectés peuvent lire (pour l'admin)
CREATE POLICY "click_select" ON formation_clicks
  FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- Fonction RPC pour agréger les stats par formation
-- ============================================================
CREATE OR REPLACE FUNCTION formation_click_stats()
RETURNS TABLE(formation_id bigint, titre text, nb bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    c.formation_id,
    f.titre,
    COUNT(*) AS nb
  FROM formation_clicks c
  JOIN formations f ON f.id = c.formation_id
  GROUP BY c.formation_id, f.titre
  ORDER BY nb DESC;
$$;
