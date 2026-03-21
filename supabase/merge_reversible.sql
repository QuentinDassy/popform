-- Rendre la fusion de profils formateur réversible
ALTER TABLE formateurs
  ADD COLUMN IF NOT EXISTS merged_into_id BIGINT REFERENCES formateurs(id) ON DELETE SET NULL;

-- Index pour retrouver rapidement les orphans fusionnés
CREATE INDEX IF NOT EXISTS idx_formateurs_merged_into ON formateurs(merged_into_id) WHERE merged_into_id IS NOT NULL;
