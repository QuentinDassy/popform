-- Migration: créer la table newsletter_subscribers
-- Stocke les emails inscrits à la newsletter PopForm

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT newsletter_subscribers_email_key UNIQUE (email)
);

-- RLS : lecture/écriture uniquement via service role (pas d'accès public direct)
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Politique pour le service role (contourne toutes les policies)
-- Le service role bypass RLS automatiquement, pas besoin de policy spécifique.
-- Pour l'admin, on peut lire via service role aussi.
