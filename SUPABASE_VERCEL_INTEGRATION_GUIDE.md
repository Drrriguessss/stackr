# 🔗 Guide d'Intégration Supabase + Vercel pour Stackr

## Pourquoi cette intégration est recommandée

✅ **Configuration automatique** des variables d'environnement
✅ **Synchronisation** des clés API entre Supabase et Vercel
✅ **Déploiement simplifié** sans configuration manuelle
✅ **Sécurité renforcée** avec rotation automatique des clés
✅ **Dashboard unifié** pour gérer les deux services

## 📋 Prérequis

- Compte Vercel actif avec votre projet Stackr déployé
- Compte Supabase (gratuit)

## 🚀 Étapes détaillées

### Étape 1 : Démarrer l'intégration

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Cliquez sur **"New Project"**
3. Choisissez **"Import an existing project"** ou **"Create a new project"**
4. Vous verrez l'option **"Connect to Vercel"** - cliquez dessus

### Étape 2 : Autoriser l'intégration

1. Supabase vous redirigera vers Vercel
2. Connectez-vous à Vercel si nécessaire
3. Sélectionnez votre projet **"stackr"** dans la liste
4. Cliquez sur **"Add Integration"**
5. Autorisez les permissions demandées

### Étape 3 : Configurer le nouveau projet Supabase

1. **Nom du projet** : `stackr-library` (ou ce que vous préférez)
2. **Région** : Choisissez la plus proche (ex: `eu-central-1` pour l'Europe)
3. **Mot de passe database** : Créez un mot de passe fort (sauvegardez-le!)
4. Cliquez sur **"Create new project"**

### Étape 4 : Configuration automatique

Supabase va automatiquement :
- ✅ Créer les variables d'environnement dans Vercel
- ✅ Ajouter `NEXT_PUBLIC_SUPABASE_URL`
- ✅ Ajouter `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ Ajouter `SUPABASE_SERVICE_ROLE_KEY` (pour les opérations serveur)

### Étape 5 : Créer le schéma de base de données

1. Dans Supabase, allez dans **SQL Editor**
2. Créez une nouvelle requête
3. Copiez et collez ce schéma :

```sql
-- Stackr App Database Schema
-- Schéma complet pour l'application Stackr

-- Créer la table library_items
CREATE TABLE IF NOT EXISTS public.library_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('games', 'movies', 'music', 'books')),
    status TEXT NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    year INTEGER,
    rating NUMERIC,
    image TEXT,
    author TEXT,
    artist TEXT,
    director TEXT,
    developer TEXT,
    genre TEXT,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    progress INTEGER CHECK (progress >= 0 AND progress <= 100),
    notes TEXT,
    date_started TIMESTAMPTZ,
    date_completed TIMESTAMPTZ,
    
    -- Champs spécifiques aux jeux
    developers TEXT,
    publishers TEXT,
    genres TEXT,
    background_image TEXT,
    released TEXT,
    
    -- Champs spécifiques aux films/séries
    type TEXT,
    is_movie BOOLEAN,
    is_series BOOLEAN,
    total_seasons INTEGER,
    display_title TEXT,
    overview TEXT,
    runtime TEXT,
    actors TEXT,
    language TEXT,
    country TEXT,
    awards TEXT,
    
    -- Infos additionnelles
    additional_info TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activer Row Level Security
ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;

-- Créer une politique pour permettre toutes les opérations
CREATE POLICY "Enable all operations for library_items" ON public.library_items
    FOR ALL USING (true) WITH CHECK (true);

-- Activer les subscriptions temps réel
ALTER PUBLICATION supabase_realtime ADD TABLE public.library_items;

-- Créer le trigger updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_library_items_updated_at
    BEFORE UPDATE ON public.library_items
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Message de confirmation
SELECT 'Configuration de la base de données terminée !' as message;
```

4. Cliquez sur **"Run"**

### Étape 6 : Activer les fonctionnalités temps réel

1. Dans Supabase, allez dans **Database** → **Replication**
2. Cherchez `library_items` dans la liste
3. Activez **"Source"** pour cette table
4. Cliquez sur **"Enable"**

### Étape 7 : Synchroniser avec votre code local

1. Dans votre terminal local :
```bash
cd C:\Users\rgeoris\Desktop\stackr
```

2. Supprimez l'ancien `.env.local` :
```bash
rm .env.local
```

3. Récupérez les nouvelles variables depuis Vercel :
```bash
vercel env pull .env.local
```

### Étape 8 : Tester localement

```bash
npm run dev
```

Ouvrez la console du navigateur et vérifiez :
- ✅ "Supabase connected successfully!"
- ✅ "Real-time synchronization system initialized"

### Étape 9 : Redéployer sur Vercel

```bash
git add .
git commit -m "Configure Supabase + Vercel integration"
git push origin main
```

Vercel redéploiera automatiquement avec les nouvelles variables.

## 🧪 Test de synchronisation cross-device

1. Ouvrez l'app sur mobile : `https://stackr.vercel.app`
2. Ouvrez l'app sur PC dans un autre navigateur
3. Ajoutez un élément sur mobile
4. Vérifiez qu'il apparaît sur PC en moins de 5 secondes

## 🎯 Avantages de l'intégration

1. **Variables auto-synchronisées** : Changements dans Supabase = mis à jour dans Vercel
2. **Preview deployments** : Chaque PR a ses propres variables
3. **Sécurité** : Les clés sensibles ne sont jamais dans le code
4. **Monitoring** : Dashboard unifié pour voir les stats

## ⚠️ Points d'attention

- Ne commitez JAMAIS le fichier `.env.local`
- Les variables commençant par `NEXT_PUBLIC_` sont visibles côté client
- Utilisez `SUPABASE_SERVICE_ROLE_KEY` uniquement côté serveur

## 🆘 Dépannage

Si la sync ne fonctionne pas :
1. Vérifiez dans Vercel → Settings → Environment Variables
2. Assurez-vous que les variables sont présentes
3. Redéployez si nécessaire avec "Redeploy" dans Vercel

L'intégration Supabase + Vercel est la meilleure approche pour votre app !