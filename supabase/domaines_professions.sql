-- Colonne professions sur domaines_admin
-- Tableau de professions cibles (ex: ["Orthophonistes", "Kinésithérapeutes"])
-- Si vide/null => visible pour toutes les professions
ALTER TABLE domaines_admin ADD COLUMN IF NOT EXISTS professions TEXT[] DEFAULT '{}';
