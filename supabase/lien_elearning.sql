-- Migration: ajouter lien_elearning aux formations
-- Permet de stocker le lien vers le contenu e-learning d'une formation
-- Affiché dans le bloc "Formation en ligne - E-Learning" de la fiche formation

ALTER TABLE formations
  ADD COLUMN IF NOT EXISTS lien_elearning TEXT;
