-- ============================================================
-- POLITIQUES RLS (Row Level Security) — FormOrtho
-- À exécuter dans Supabase → SQL Editor
-- ============================================================
-- Ce script est idempotent : on peut le relancer sans risque.
-- Il supprime les policies existantes avant de les recréer.
-- ============================================================

-- ============================================================
-- FONCTIONS UTILITAIRES
-- ============================================================

-- Vérifie si l'utilisateur connecté est admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Retourne l'id de l'organisme lié à l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.my_organisme_id()
RETURNS integer
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT id FROM public.organismes WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Retourne l'id du formateur lié à l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.my_formateur_id()
RETURNS integer
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT id FROM public.formateurs WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- TABLE : profiles
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Chaque utilisateur lit son propre profil
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- Les admins lisent tous les profils
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Chaque utilisateur met à jour son propre profil
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- TABLE : organismes
-- ============================================================
ALTER TABLE public.organismes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organismes_select_public" ON public.organismes;
DROP POLICY IF EXISTS "organismes_insert_own" ON public.organismes;
DROP POLICY IF EXISTS "organismes_update_own" ON public.organismes;
DROP POLICY IF EXISTS "organismes_update_admin" ON public.organismes;
DROP POLICY IF EXISTS "organismes_delete_admin" ON public.organismes;

-- Tout le monde lit les organismes
CREATE POLICY "organismes_select_public"
  ON public.organismes FOR SELECT
  USING (true);

-- Un utilisateur avec rôle organisme peut créer un organisme lié à lui
CREATE POLICY "organismes_insert_own"
  ON public.organismes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organisme', 'admin'))
  );

-- L'organisme met à jour son propre enregistrement
CREATE POLICY "organismes_update_own"
  ON public.organismes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Les admins peuvent tout mettre à jour
CREATE POLICY "organismes_update_admin"
  ON public.organismes FOR UPDATE
  USING (public.is_admin());

-- Les admins peuvent supprimer
CREATE POLICY "organismes_delete_admin"
  ON public.organismes FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- TABLE : formateurs
-- ============================================================
ALTER TABLE public.formateurs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "formateurs_select_public" ON public.formateurs;
DROP POLICY IF EXISTS "formateurs_insert_own" ON public.formateurs;
DROP POLICY IF EXISTS "formateurs_insert_organisme" ON public.formateurs;
DROP POLICY IF EXISTS "formateurs_update_own" ON public.formateurs;
DROP POLICY IF EXISTS "formateurs_update_organisme" ON public.formateurs;
DROP POLICY IF EXISTS "formateurs_update_admin" ON public.formateurs;
DROP POLICY IF EXISTS "formateurs_delete_admin" ON public.formateurs;

-- Tout le monde lit les formateurs
CREATE POLICY "formateurs_select_public"
  ON public.formateurs FOR SELECT
  USING (true);

-- Un utilisateur formateur peut créer son profil
CREATE POLICY "formateurs_insert_own"
  ON public.formateurs FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('formateur', 'admin'))
  );

-- Un organisme peut créer des formateurs liés à son organisme (inline creation)
CREATE POLICY "formateurs_insert_organisme"
  ON public.formateurs FOR INSERT
  WITH CHECK (
    organisme_id = public.my_organisme_id()
  );

-- Un formateur met à jour son propre profil
CREATE POLICY "formateurs_update_own"
  ON public.formateurs FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Un organisme peut modifier les formateurs qui lui appartiennent
CREATE POLICY "formateurs_update_organisme"
  ON public.formateurs FOR UPDATE
  USING (organisme_id = public.my_organisme_id());

-- Admins peuvent tout modifier
CREATE POLICY "formateurs_update_admin"
  ON public.formateurs FOR UPDATE
  USING (public.is_admin());

-- Admins peuvent supprimer
CREATE POLICY "formateurs_delete_admin"
  ON public.formateurs FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- TABLE : formations
-- ============================================================
ALTER TABLE public.formations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "formations_select_public" ON public.formations;
DROP POLICY IF EXISTS "formations_select_own_organisme" ON public.formations;
DROP POLICY IF EXISTS "formations_select_own_formateur" ON public.formations;
DROP POLICY IF EXISTS "formations_select_admin" ON public.formations;
DROP POLICY IF EXISTS "formations_insert_organisme" ON public.formations;
DROP POLICY IF EXISTS "formations_insert_formateur" ON public.formations;
DROP POLICY IF EXISTS "formations_update_organisme" ON public.formations;
DROP POLICY IF EXISTS "formations_update_formateur" ON public.formations;
DROP POLICY IF EXISTS "formations_update_admin" ON public.formations;
DROP POLICY IF EXISTS "formations_delete_organisme" ON public.formations;
DROP POLICY IF EXISTS "formations_delete_formateur" ON public.formations;
DROP POLICY IF EXISTS "formations_delete_admin" ON public.formations;

-- Tout le monde lit les formations publiées
CREATE POLICY "formations_select_public"
  ON public.formations FOR SELECT
  USING (status = 'publiee');

-- Les organismes voient leurs propres formations (tous statuts)
CREATE POLICY "formations_select_own_organisme"
  ON public.formations FOR SELECT
  USING (organisme_id = public.my_organisme_id());

-- Les formateurs voient leurs propres formations (tous statuts)
CREATE POLICY "formations_select_own_formateur"
  ON public.formations FOR SELECT
  USING (formateur_id = public.my_formateur_id());

-- Les admins voient toutes les formations
CREATE POLICY "formations_select_admin"
  ON public.formations FOR SELECT
  USING (public.is_admin());

-- Les organismes créent leurs formations
CREATE POLICY "formations_insert_organisme"
  ON public.formations FOR INSERT
  WITH CHECK (organisme_id = public.my_organisme_id());

-- Les formateurs créent leurs formations
CREATE POLICY "formations_insert_formateur"
  ON public.formations FOR INSERT
  WITH CHECK (formateur_id = public.my_formateur_id());

-- Les organismes modifient leurs formations
CREATE POLICY "formations_update_organisme"
  ON public.formations FOR UPDATE
  USING (organisme_id = public.my_organisme_id())
  WITH CHECK (organisme_id = public.my_organisme_id());

-- Les formateurs modifient leurs formations
CREATE POLICY "formations_update_formateur"
  ON public.formations FOR UPDATE
  USING (formateur_id = public.my_formateur_id())
  WITH CHECK (formateur_id = public.my_formateur_id());

-- Les admins modifient toutes les formations (publication, refus, etc.)
CREATE POLICY "formations_update_admin"
  ON public.formations FOR UPDATE
  USING (public.is_admin());

-- Les organismes suppriment leurs formations
CREATE POLICY "formations_delete_organisme"
  ON public.formations FOR DELETE
  USING (organisme_id = public.my_organisme_id());

-- Les formateurs suppriment leurs formations
CREATE POLICY "formations_delete_formateur"
  ON public.formations FOR DELETE
  USING (formateur_id = public.my_formateur_id());

-- Les admins suppriment n'importe quelle formation
CREATE POLICY "formations_delete_admin"
  ON public.formations FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- TABLE : sessions
-- ============================================================
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_select_public" ON public.sessions;
DROP POLICY IF EXISTS "sessions_select_owner" ON public.sessions;
DROP POLICY IF EXISTS "sessions_insert_owner" ON public.sessions;
DROP POLICY IF EXISTS "sessions_update_owner" ON public.sessions;
DROP POLICY IF EXISTS "sessions_delete_owner" ON public.sessions;
DROP POLICY IF EXISTS "sessions_all_admin" ON public.sessions;

-- Sessions des formations publiées accessibles à tous
CREATE POLICY "sessions_select_public"
  ON public.sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.formations f
      WHERE f.id = formation_id AND f.status = 'publiee'
    )
  );

-- Propriétaire (organisme ou formateur) voit ses sessions
CREATE POLICY "sessions_select_owner"
  ON public.sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.formations f
      WHERE f.id = formation_id
        AND (f.organisme_id = public.my_organisme_id() OR f.formateur_id = public.my_formateur_id())
    )
  );

-- Le propriétaire crée des sessions
CREATE POLICY "sessions_insert_owner"
  ON public.sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.formations f
      WHERE f.id = formation_id
        AND (f.organisme_id = public.my_organisme_id() OR f.formateur_id = public.my_formateur_id())
    )
  );

-- Le propriétaire modifie ses sessions
CREATE POLICY "sessions_update_owner"
  ON public.sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.formations f
      WHERE f.id = formation_id
        AND (f.organisme_id = public.my_organisme_id() OR f.formateur_id = public.my_formateur_id())
    )
  );

-- Le propriétaire supprime ses sessions
CREATE POLICY "sessions_delete_owner"
  ON public.sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.formations f
      WHERE f.id = formation_id
        AND (f.organisme_id = public.my_organisme_id() OR f.formateur_id = public.my_formateur_id())
    )
  );

-- Admins : accès total
CREATE POLICY "sessions_all_admin"
  ON public.sessions FOR ALL
  USING (public.is_admin());

-- ============================================================
-- TABLE : session_parties
-- ============================================================
ALTER TABLE public.session_parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_parties_select_public" ON public.session_parties;
DROP POLICY IF EXISTS "session_parties_select_owner" ON public.session_parties;
DROP POLICY IF EXISTS "session_parties_insert_owner" ON public.session_parties;
DROP POLICY IF EXISTS "session_parties_update_owner" ON public.session_parties;
DROP POLICY IF EXISTS "session_parties_delete_owner" ON public.session_parties;
DROP POLICY IF EXISTS "session_parties_all_admin" ON public.session_parties;

CREATE POLICY "session_parties_select_public"
  ON public.session_parties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.formations f ON f.id = s.formation_id
      WHERE s.id = session_id AND f.status = 'publiee'
    )
  );

CREATE POLICY "session_parties_select_owner"
  ON public.session_parties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.formations f ON f.id = s.formation_id
      WHERE s.id = session_id
        AND (f.organisme_id = public.my_organisme_id() OR f.formateur_id = public.my_formateur_id())
    )
  );

CREATE POLICY "session_parties_insert_owner"
  ON public.session_parties FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.formations f ON f.id = s.formation_id
      WHERE s.id = session_id
        AND (f.organisme_id = public.my_organisme_id() OR f.formateur_id = public.my_formateur_id())
    )
  );

CREATE POLICY "session_parties_update_owner"
  ON public.session_parties FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.formations f ON f.id = s.formation_id
      WHERE s.id = session_id
        AND (f.organisme_id = public.my_organisme_id() OR f.formateur_id = public.my_formateur_id())
    )
  );

CREATE POLICY "session_parties_delete_owner"
  ON public.session_parties FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.formations f ON f.id = s.formation_id
      WHERE s.id = session_id
        AND (f.organisme_id = public.my_organisme_id() OR f.formateur_id = public.my_formateur_id())
    )
  );

CREATE POLICY "session_parties_all_admin"
  ON public.session_parties FOR ALL
  USING (public.is_admin());

-- ============================================================
-- TABLE : avis
-- ============================================================
ALTER TABLE public.avis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "avis_select_public" ON public.avis;
DROP POLICY IF EXISTS "avis_insert_authenticated" ON public.avis;
DROP POLICY IF EXISTS "avis_update_own" ON public.avis;
DROP POLICY IF EXISTS "avis_delete_own" ON public.avis;
DROP POLICY IF EXISTS "avis_delete_admin" ON public.avis;

-- Tout le monde lit les avis
CREATE POLICY "avis_select_public"
  ON public.avis FOR SELECT
  USING (true);

-- Les utilisateurs connectés créent des avis (un seul par formation géré côté app)
CREATE POLICY "avis_insert_authenticated"
  ON public.avis FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Chacun modifie son propre avis
CREATE POLICY "avis_update_own"
  ON public.avis FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Chacun supprime son propre avis
CREATE POLICY "avis_delete_own"
  ON public.avis FOR DELETE
  USING (user_id = auth.uid());

-- Admins peuvent supprimer n'importe quel avis (modération)
CREATE POLICY "avis_delete_admin"
  ON public.avis FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- TABLE : inscriptions
-- ============================================================
ALTER TABLE public.inscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inscriptions_select_own" ON public.inscriptions;
DROP POLICY IF EXISTS "inscriptions_select_admin" ON public.inscriptions;
DROP POLICY IF EXISTS "inscriptions_insert_own" ON public.inscriptions;
DROP POLICY IF EXISTS "inscriptions_delete_own" ON public.inscriptions;
DROP POLICY IF EXISTS "inscriptions_all_admin" ON public.inscriptions;

-- Chacun voit ses propres inscriptions
CREATE POLICY "inscriptions_select_own"
  ON public.inscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Admins/organismes voient les inscriptions à leurs formations
CREATE POLICY "inscriptions_select_admin"
  ON public.inscriptions FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.formations f
      WHERE f.id = formation_id
        AND (f.organisme_id = public.my_organisme_id() OR f.formateur_id = public.my_formateur_id())
    )
  );

-- Chacun crée ses propres inscriptions
CREATE POLICY "inscriptions_insert_own"
  ON public.inscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Chacun annule ses propres inscriptions
CREATE POLICY "inscriptions_delete_own"
  ON public.inscriptions FOR DELETE
  USING (user_id = auth.uid());

-- Admins gèrent toutes les inscriptions
CREATE POLICY "inscriptions_all_admin"
  ON public.inscriptions FOR ALL
  USING (public.is_admin());

-- ============================================================
-- TABLE : favoris
-- ============================================================
ALTER TABLE public.favoris ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favoris_select_own" ON public.favoris;
DROP POLICY IF EXISTS "favoris_insert_own" ON public.favoris;
DROP POLICY IF EXISTS "favoris_delete_own" ON public.favoris;

CREATE POLICY "favoris_select_own"
  ON public.favoris FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "favoris_insert_own"
  ON public.favoris FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "favoris_delete_own"
  ON public.favoris FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- TABLE : admin_notifications
-- ============================================================
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifs_select_admin" ON public.admin_notifications;
DROP POLICY IF EXISTS "notifs_insert_authenticated" ON public.admin_notifications;
DROP POLICY IF EXISTS "notifs_update_admin" ON public.admin_notifications;
DROP POLICY IF EXISTS "notifs_delete_admin" ON public.admin_notifications;

-- Seuls les admins lisent les notifications
CREATE POLICY "notifs_select_admin"
  ON public.admin_notifications FOR SELECT
  USING (public.is_admin());

-- Les utilisateurs connectés peuvent créer des notifications (ex : soumission formation)
CREATE POLICY "notifs_insert_authenticated"
  ON public.admin_notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admins marquent comme lues / modifient
CREATE POLICY "notifs_update_admin"
  ON public.admin_notifications FOR UPDATE
  USING (public.is_admin());

-- Admins suppriment
CREATE POLICY "notifs_delete_admin"
  ON public.admin_notifications FOR DELETE
  USING (public.is_admin());

-- ============================================================
-- TABLE : domaines_admin
-- ============================================================
ALTER TABLE public.domaines_admin ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "domaines_select_public" ON public.domaines_admin;
DROP POLICY IF EXISTS "domaines_all_admin" ON public.domaines_admin;

CREATE POLICY "domaines_select_public"
  ON public.domaines_admin FOR SELECT
  USING (true);

CREATE POLICY "domaines_all_admin"
  ON public.domaines_admin FOR ALL
  USING (public.is_admin());

-- ============================================================
-- TABLE : villes_admin
-- ============================================================
ALTER TABLE public.villes_admin ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "villes_select_public" ON public.villes_admin;
DROP POLICY IF EXISTS "villes_all_admin" ON public.villes_admin;

CREATE POLICY "villes_select_public"
  ON public.villes_admin FOR SELECT
  USING (true);

CREATE POLICY "villes_all_admin"
  ON public.villes_admin FOR ALL
  USING (public.is_admin());

-- ============================================================
-- TABLE : webinaires
-- ============================================================
ALTER TABLE public.webinaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webinaires_select_public" ON public.webinaires;
DROP POLICY IF EXISTS "webinaires_select_owner" ON public.webinaires;
DROP POLICY IF EXISTS "webinaires_insert_owner" ON public.webinaires;
DROP POLICY IF EXISTS "webinaires_update_owner" ON public.webinaires;
DROP POLICY IF EXISTS "webinaires_delete_owner" ON public.webinaires;
DROP POLICY IF EXISTS "webinaires_all_admin" ON public.webinaires;

CREATE POLICY "webinaires_select_public"
  ON public.webinaires FOR SELECT
  USING (status = 'publie' OR status IS NULL OR status != 'refuse');

CREATE POLICY "webinaires_select_owner"
  ON public.webinaires FOR SELECT
  USING (organisme_id = public.my_organisme_id());

CREATE POLICY "webinaires_insert_owner"
  ON public.webinaires FOR INSERT
  WITH CHECK (organisme_id = public.my_organisme_id());

CREATE POLICY "webinaires_update_owner"
  ON public.webinaires FOR UPDATE
  USING (organisme_id = public.my_organisme_id());

CREATE POLICY "webinaires_delete_owner"
  ON public.webinaires FOR DELETE
  USING (organisme_id = public.my_organisme_id());

CREATE POLICY "webinaires_all_admin"
  ON public.webinaires FOR ALL
  USING (public.is_admin());

-- ============================================================
-- TABLE : congres
-- ============================================================
ALTER TABLE public.congres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "congres_select_public" ON public.congres;
DROP POLICY IF EXISTS "congres_select_owner" ON public.congres;
DROP POLICY IF EXISTS "congres_insert_owner" ON public.congres;
DROP POLICY IF EXISTS "congres_update_owner" ON public.congres;
DROP POLICY IF EXISTS "congres_delete_owner" ON public.congres;
DROP POLICY IF EXISTS "congres_all_admin" ON public.congres;

CREATE POLICY "congres_select_public"
  ON public.congres FOR SELECT
  USING (true);

CREATE POLICY "congres_select_owner"
  ON public.congres FOR SELECT
  USING (organisme_id = public.my_organisme_id());

CREATE POLICY "congres_insert_owner"
  ON public.congres FOR INSERT
  WITH CHECK (organisme_id = public.my_organisme_id());

CREATE POLICY "congres_update_owner"
  ON public.congres FOR UPDATE
  USING (organisme_id = public.my_organisme_id());

CREATE POLICY "congres_delete_owner"
  ON public.congres FOR DELETE
  USING (organisme_id = public.my_organisme_id());

CREATE POLICY "congres_all_admin"
  ON public.congres FOR ALL
  USING (public.is_admin());

-- ============================================================
-- TABLE : congres_speakers
-- ============================================================
ALTER TABLE public.congres_speakers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "speakers_select_public" ON public.congres_speakers;
DROP POLICY IF EXISTS "speakers_insert_owner" ON public.congres_speakers;
DROP POLICY IF EXISTS "speakers_update_owner" ON public.congres_speakers;
DROP POLICY IF EXISTS "speakers_delete_owner" ON public.congres_speakers;
DROP POLICY IF EXISTS "speakers_all_admin" ON public.congres_speakers;

CREATE POLICY "speakers_select_public"
  ON public.congres_speakers FOR SELECT
  USING (true);

CREATE POLICY "speakers_insert_owner"
  ON public.congres_speakers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.congres c
      WHERE c.id = congres_id AND c.organisme_id = public.my_organisme_id()
    )
  );

CREATE POLICY "speakers_update_owner"
  ON public.congres_speakers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.congres c
      WHERE c.id = congres_id AND c.organisme_id = public.my_organisme_id()
    )
  );

CREATE POLICY "speakers_delete_owner"
  ON public.congres_speakers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.congres c
      WHERE c.id = congres_id AND c.organisme_id = public.my_organisme_id()
    )
  );

CREATE POLICY "speakers_all_admin"
  ON public.congres_speakers FOR ALL
  USING (public.is_admin());

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
-- Vérification : lister toutes les policies créées
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
