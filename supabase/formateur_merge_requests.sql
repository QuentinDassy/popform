-- Demandes de fusion de profils formateurs (validées par l'admin)
CREATE TABLE IF NOT EXISTS formateur_merge_requests (
  id BIGSERIAL PRIMARY KEY,
  orphan_id BIGINT NOT NULL REFERENCES formateurs(id) ON DELETE CASCADE,
  target_id BIGINT NOT NULL REFERENCES formateurs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE formateur_merge_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can do anything on merge requests"
  ON formateur_merge_requests FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can insert their own merge requests"
  ON formateur_merge_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own merge requests"
  ON formateur_merge_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());
