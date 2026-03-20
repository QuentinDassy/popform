-- Permet à l'admin de voir TOUTES les formations (y compris supprimées, archivées, refusées)
-- À exécuter dans Supabase > SQL Editor

-- 1. Ajouter la colonne supprime_par si pas encore fait
ALTER TABLE formations
  ADD COLUMN IF NOT EXISTS supprime_par TEXT;

-- 2. Politique RLS : admin voit tout
DROP POLICY IF EXISTS "Admin voir toutes formations" ON formations;

CREATE POLICY "Admin voir toutes formations"
  ON formations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 3. Vérification : lister les politiques existantes sur formations
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'formations'
ORDER BY policyname;
