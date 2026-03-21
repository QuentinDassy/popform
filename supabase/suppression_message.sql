-- Migration: ajouter suppression_message aux formations
-- Permet aux formateurs/organismes d'indiquer la raison de la suppression

ALTER TABLE formations
  ADD COLUMN IF NOT EXISTS suppression_message TEXT;

-- Mettre à jour supprime_par pour stocker le nom (ex: "formateur:Marie Dupont" ou "organisme:Mon Org")
-- La colonne supprime_par existe déjà (supprime_par.sql), on l'utilise déjà comme TEXT

-- Table pour les demandes d'association formateur <-> formation
CREATE TABLE IF NOT EXISTS formation_association_requests (
  id BIGSERIAL PRIMARY KEY,
  formation_id BIGINT NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  formateur_id BIGINT NOT NULL REFERENCES formateurs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: seul l'admin peut voir toutes les demandes; les formateurs voient les leurs
ALTER TABLE formation_association_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can do anything on association requests"
  ON formation_association_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Formateurs can insert their own requests"
  ON formation_association_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Formateurs can view their own requests"
  ON formation_association_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
