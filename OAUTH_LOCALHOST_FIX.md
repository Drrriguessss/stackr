# Fix OAuth Redirect vers Production au lieu de Localhost

## Le Problème
Quand vous vous connectez avec Google OAuth sur localhost, vous êtes redirigé vers production (stackr-three.vercel.app) au lieu de rester sur localhost.

## La Solution

### 1. Configurer Supabase Dashboard

1. Allez dans votre [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Authentication** → **URL Configuration**
4. Dans **Redirect URLs**, ajoutez TOUTES ces URLs :
   ```
   http://localhost:3000/auth/callback
   http://localhost:3001/auth/callback
   http://localhost:3006/auth/callback
   http://localhost:3007/auth/callback
   http://localhost:3008/auth/callback
   https://stackr-three.vercel.app/auth/callback
   ```
5. Cliquez sur **Save**

### 2. Configurer Google OAuth (Console Google Cloud)

1. Allez dans [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. Allez dans **APIs & Services** → **Credentials**
4. Cliquez sur votre OAuth 2.0 Client ID
5. Dans **Authorized JavaScript origins**, ajoutez :
   ```
   http://localhost:3000
   http://localhost:3006
   http://localhost:3007
   ```
6. Dans **Authorized redirect URIs**, ajoutez :
   ```
   http://localhost:3000/auth/callback
   http://localhost:3006/auth/callback
   http://localhost:3007/auth/callback
   ```
7. Cliquez sur **Save**

### 3. Solution Alternative (Plus Simple)

Si les étapes ci-dessus sont trop complexes, utilisez simplement l'authentification email/password sur localhost :

1. Allez sur `http://localhost:3007/debug-auth`
2. Utilisez vos identifiants email/password existants
3. Ou créez un nouveau compte test

## Vérification

Après configuration :
1. Videz le cache de votre navigateur
2. Testez sur `http://localhost:3007/debug-auth`
3. La redirection devrait maintenant rester sur localhost

## Notes Importantes

- Les changements dans Supabase Dashboard peuvent prendre quelques minutes pour s'appliquer
- Google OAuth peut mettre jusqu'à 5 minutes pour propager les changements
- En production, l'OAuth continuera de rediriger vers stackr-three.vercel.app (comportement normal)