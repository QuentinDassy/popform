-- Migration: ajouter organisme_id et organisme_libre aux sessions
-- Permet aux formateurs de rattacher chaque session à un organisme spécifique
-- (soit un organisme existant via organisme_id, soit un nom libre via organisme_libre)

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS organisme_id INTEGER REFERENCES organismes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS organisme_libre TEXT,
  ADD COLUMN IF NOT EXISTS url_inscription TEXT;
