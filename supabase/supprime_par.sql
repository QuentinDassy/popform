-- Migration: ajouter supprime_par aux formations
-- Permet de savoir si une formation a été supprimée par un formateur, un organisme ou l'admin

ALTER TABLE formations
  ADD COLUMN IF NOT EXISTS supprime_par TEXT;
