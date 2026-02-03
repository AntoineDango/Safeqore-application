# Configuration Firebase Admin SDK

Le backend a besoin des credentials Firebase Admin pour vérifier les tokens d'authentification.

## Étapes de configuration

### 1. Obtenir le Service Account Key

1. Allez sur https://console.firebase.google.com/
2. Sélectionnez le projet **safeqore**
3. Cliquez sur l'icône ⚙️ (Settings) → **Project Settings**
4. Allez dans l'onglet **Service Accounts**
5. Cliquez sur **Generate New Private Key**
6. Téléchargez le fichier JSON

### 2. Configurer le backend

**Option A : Fichier JSON (recommandé pour le développement)**

1. Placez le fichier téléchargé dans `/home/dango/Documents/projects-safeqore/safeqore_IA/`
2. Renommez-le en `serviceAccountKey.json`
3. Ajoutez dans `.env` :
   ```
   GOOGLE_APPLICATION_CREDENTIALS=/home/dango/Documents/projects-safeqore/safeqore_IA/serviceAccountKey.json
   ```

**Option B : Variable d'environnement (recommandé pour la production)**

1. Ouvrez le fichier JSON téléchargé
2. Copiez tout le contenu
3. Ajoutez dans `.env` :
   ```
   FIREBASE_CREDENTIALS_JSON='{"type":"service_account","project_id":"safeqore",...}'
   ```

### 3. Redémarrer le backend

```bash
cd /home/dango/Documents/projects-safeqore/safeqore_IA
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Vérifier que ça fonctionne

L'authentification devrait maintenant fonctionner et vous ne devriez plus voir d'erreurs 401 Unauthorized.

## Sécurité

⚠️ **IMPORTANT** : Ne commitez JAMAIS le fichier `serviceAccountKey.json` ou le contenu de `FIREBASE_CREDENTIALS_JSON` dans Git !

Le fichier `.gitignore` devrait déjà contenir :
```
.env
serviceAccountKey.json
```
