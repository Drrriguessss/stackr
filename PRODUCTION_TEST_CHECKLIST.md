# 🧪 CHECKLIST DE TEST PRODUCTION - Stackr

URL Production : https://stackr-three.vercel.app

## 📋 Tests à effectuer dans l'ordre

### 1️⃣ Test de Connexion
- [ ] Ouvrir la console du navigateur (F12 → Console)
- [ ] Se connecter avec votre compte (Google OAuth ou email/password)
- [ ] **VÉRIFIER dans les logs** : `✅ [AuthService] Current user found: [votre email]`
- [ ] Noter l'ID utilisateur qui apparaît dans les logs

### 2️⃣ Test de Chargement de la Bibliothèque
- [ ] Rafraîchir la page après connexion
- [ ] **VÉRIFIER dans les logs** : `📚 Library loaded from Supabase: [X] items`
- [ ] Si vous voyez "Library loaded from localStorage" au lieu de Supabase, c'est un problème

### 3️⃣ Test de Changement de Statut (Film)
- [ ] Ouvrir un film (n'importe lequel)
- [ ] **NOTER** le statut actuel (ou absence de statut)
- [ ] Changer le statut (ex: want-to-watch → watching → watched)
- [ ] **VÉRIFIER dans les logs** :
  - `🎬 [MOVIE MODAL] 🔒 User interaction started`
  - `👤 [LibraryService] User authenticated, trying Supabase sync`
  - `✅ [LibraryService] Successfully added to Supabase` OU `📝 Updated item in Supabase`
  - `🎬 [MOVIE MODAL] ✅ Library update completed`

### 4️⃣ Test de Persistance (Le Plus Important !)
- [ ] Fermer le modal du film
- [ ] **ATTENDRE 5 secondes**
- [ ] Rouvrir le MÊME film
- [ ] **VÉRIFIER** : Le statut est-il conservé ?
- [ ] **VÉRIFIER dans les logs** :
  - `🔄 [MOVIE MODAL] INITIAL LOAD - synchronizing status`
  - `🔍 [MOVIE MODAL] Found library item: {status: '[votre statut]'}`
  - `🔄 [MOVIE MODAL] Setting INITIAL status to: [votre statut]`

### 5️⃣ Test de Rafraîchissement de Page
- [ ] Avec un film ayant un statut défini
- [ ] Rafraîchir complètement la page (F5)
- [ ] Rouvrir le même film
- [ ] **VÉRIFIER** : Le statut est-il toujours là ?

### 6️⃣ Test Multi-Changements Rapides
- [ ] Ouvrir un film
- [ ] Changer rapidement le statut 3-4 fois de suite
- [ ] **VÉRIFIER dans les logs** : `🔄 [MOVIE MODAL] Blocking library sync - recent user action`
- [ ] Fermer et rouvrir
- [ ] **VÉRIFIER** : Le dernier statut sélectionné est-il conservé ?

## 🔍 Points de Diagnostic Importants

### Si ça NE fonctionne PAS, cherchez ces ERREURS dans les logs :

#### ❌ Erreurs d'Authentification
- `❌ [AuthService] Error getting user`
- `ℹ️ [AuthService] No user found - user not authenticated`
- → **Problème** : Utilisateur pas connecté ou session expirée

#### ❌ Erreurs Supabase
- `❌ [LibraryService] Supabase error:`
- `⚠️ Supabase unavailable`
- → **Problème** : Connexion Supabase échouée
- → **Copier** l'erreur complète pour diagnostic

#### ❌ Erreurs de Synchronisation
- `🔄 [MOVIE MODAL] Allowing library sync - no recent user action`
- Suivi immédiatement d'un changement de statut non désiré
- → **Problème** : Protection contre les conflits ne fonctionne pas

#### ❌ Absence de Logs
- Si vous ne voyez AUCUN log `[LibraryService]` lors du changement de statut
- → **Problème** : Le code n'appelle pas le service correctement

## 📊 Logs à Capturer en cas de Problème

Si quelque chose ne fonctionne pas, copiez TOUS les logs depuis :
1. **Le moment de la connexion**
2. **L'ouverture du premier film**
3. **Le changement de statut**
4. **La fermeture du modal**
5. **La réouverture du modal**

### Format idéal pour reporter un problème :
```
ÉTAPE 1 : Connexion
[logs...]

ÉTAPE 2 : Ouverture film "Titre du Film"
[logs...]

ÉTAPE 3 : Changement statut de X vers Y
[logs...]

ÉTAPE 4 : Fermeture et réouverture
[logs...]

RÉSULTAT : Le statut [est/n'est pas] conservé
```

## ✅ Si TOUT fonctionne

Vous devriez voir :
- ✅ Connexion réussie avec ID utilisateur
- ✅ Bibliothèque chargée depuis Supabase
- ✅ Changements de statut sauvegardés dans Supabase
- ✅ Statuts persistants après fermeture/réouverture
- ✅ Statuts persistants après rafraîchissement de page
- ✅ Protection contre les conflits de synchronisation active

## 🚨 Tests Spécifiques pour Débugger

### Test A : Vérifier la connexion Supabase
Ouvrir la console et taper :
```javascript
localStorage.getItem('sb-jptdjsmzywyzvasqojv-auth-token')
```
→ Devrait retourner un token (pas null)

### Test B : Vérifier la bibliothèque locale
Ouvrir la console et taper :
```javascript
localStorage.getItem('stackr_library_9b57b202-980e-49d6-a9a3-30db5d6ed4e8')
```
(Remplacer l'ID par votre ID utilisateur des logs)
→ Devrait retourner un JSON avec vos films

### Test C : Vérifier les événements
Ouvrir la console et taper :
```javascript
window.addEventListener('library-changed', (e) => console.log('EVENT:', e.detail))
```
Puis changer un statut
→ Devrait afficher l'événement dans la console

---

## 📝 Notes Importantes

1. **Videz le cache** si vous aviez testé avant le fix
2. **Utilisez un navigateur en navigation privée** pour un test propre
3. **Attendez 30 secondes** après le push Git pour que Vercel déploie
4. L'URL de production est : https://stackr-three.vercel.app