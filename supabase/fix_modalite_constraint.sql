-- Fix: s'assurer que la contrainte formations_modalite_check accepte toutes les valeurs

ALTER TABLE formations DROP CONSTRAINT IF EXISTS formations_modalite_check;

ALTER TABLE formations
  ADD CONSTRAINT formations_modalite_check
  CHECK (modalite IN ('Présentiel', 'Visio', 'Mixte', 'E-learning'));
