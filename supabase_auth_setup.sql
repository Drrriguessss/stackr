-- Supabase Auth Setup for Stackr
-- Execute this SQL in your Supabase SQL Editor

-- 1. Ajouter la colonne user_id à la table library_items (si elle n'existe pas déjà)
ALTER TABLE library_items 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Créer un index sur user_id pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_library_items_user_id ON library_items(user_id);

-- 3. Activer Row Level Security (RLS) sur la table library_items
ALTER TABLE library_items ENABLE ROW LEVEL SECURITY;

-- 4. Créer une politique pour que les utilisateurs ne voient que leurs propres éléments
CREATE POLICY "Users can only see their own library items" ON library_items
  FOR ALL USING (auth.uid() = user_id);

-- 5. Créer une politique pour l'insertion (les utilisateurs peuvent ajouter à leur bibliothèque)
CREATE POLICY "Users can insert their own library items" ON library_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Créer une politique pour la mise à jour (les utilisateurs peuvent modifier leurs propres éléments)
CREATE POLICY "Users can update their own library items" ON library_items
  FOR UPDATE USING (auth.uid() = user_id);

-- 7. Créer une politique pour la suppression (les utilisateurs peuvent supprimer leurs propres éléments)
CREATE POLICY "Users can delete their own library items" ON library_items
  FOR DELETE USING (auth.uid() = user_id);

-- 8. Optionnel: Créer une fonction pour obtenir le profil utilisateur
CREATE OR REPLACE FUNCTION public.get_user_profile()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.users.id,
    auth.users.email::text,
    (auth.users.raw_user_meta_data->>'full_name')::text,
    (auth.users.raw_user_meta_data->>'avatar_url')::text,
    auth.users.created_at
  FROM auth.users
  WHERE auth.users.id = auth.uid();
END;
$$;

-- 9. Donner accès à la fonction au public
GRANT EXECUTE ON FUNCTION public.get_user_profile() TO PUBLIC;

-- Note: Après avoir exécuté ce script, vous devrez configurer les fournisseurs OAuth 
-- dans l'interface Supabase Dashboard > Authentication > Settings > Auth Providers:
-- - Google OAuth
-- - Apple OAuth  
-- - Facebook OAuth

-- Les URL de callback à configurer dans vos apps OAuth:
-- - Callback URL: https://votre-projet.supabase.co/auth/v1/callback
-- - Site URL: https://votre-domaine.com (ou http://localhost:3000 pour le dev)