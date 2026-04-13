-- Table pour les alertes email utilisateur
CREATE TABLE IF NOT EXISTS alertes_email (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('organisme', 'formateur', 'domaine', 'mots_cles')),
  valeur TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS alertes_email_unique
  ON alertes_email(user_id, type, valeur);

ALTER TABLE alertes_email ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alertes_own" ON alertes_email
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Formateur optionnel sur webinaires
ALTER TABLE webinaires ADD COLUMN IF NOT EXISTS formateur_id INTEGER REFERENCES formateurs(id) ON DELETE SET NULL;
