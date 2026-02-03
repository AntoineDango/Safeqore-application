# 🗑️ Endpoint DELETE - Suppression d'analyse

## 📋 Résumé

Ajout de l'endpoint **DELETE /user/analyses/{analysis_id}** pour permettre aux utilisateurs de supprimer leurs propres analyses.

---

## 🔧 Endpoint créé

### DELETE /user/analyses/{analysis_id}

**Description :** Supprime une analyse utilisateur spécifique par son ID.

**URL :** `DELETE /user/analyses/{analysis_id}`

**Authentification :** Requise (Firebase Bearer Token)

**Paramètres :**
- `analysis_id` (path) : ID de l'analyse à supprimer

**Headers requis :**
```
Authorization: Bearer {firebase_token}
```

---

## 📊 Exemples de requêtes

### Requête réussie

```bash
curl -X DELETE "http://localhost:8000/user/analyses/QA_20260125123146_103" \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Réponse (200 OK) :**
```json
{
  "status": "deleted",
  "id": "QA_20260125123146_103",
  "message": "Analyse QA_20260125123146_103 supprimée avec succès"
}
```

### Analyse non trouvée

**Réponse (404 Not Found) :**
```json
{
  "detail": "Analyse QA_20260125123146_103 non trouvée"
}
```

### Accès non autorisé

**Réponse (403 Forbidden) :**
```json
{
  "detail": "Accès non autorisé à cette analyse"
}
```

### Non authentifié

**Réponse (401 Unauthorized) :**
```json
{
  "detail": "Token d'authentification manquant ou invalide"
}
```

---

## 🔒 Sécurité

### Vérifications effectuées

1. **Authentification Firebase**
   - Le token Bearer doit être valide
   - L'utilisateur doit être authentifié

2. **Autorisation**
   - L'analyse doit appartenir à l'utilisateur connecté
   - Vérification du champ `user_uid` dans l'analyse

3. **Existence**
   - L'analyse doit exister dans le fichier JSON

### Logs de sécurité

```python
print(f"[UserRouter] User {user_uid} attempting to delete analysis {analysis_id}")
print(f"[UserRouter] Access denied: analysis belongs to {analysis.get('user_uid')}, not {user_uid}")
print(f"[UserRouter] Successfully deleted analysis {analysis_id}")
```

---

## 💾 Persistance des données

### Fichier de stockage

**Chemin :** `training/data/questionnaire_analyses.json`

### Fonctionnement

1. **Chargement** : Lecture du fichier JSON
2. **Recherche** : Parcours des analyses pour trouver l'ID
3. **Vérification** : Contrôle du `user_uid`
4. **Suppression** : Retrait de l'analyse de la liste
5. **Sauvegarde** : Écriture du fichier JSON mis à jour

### Fonction de sauvegarde

```python
def _save_analyses(data: List[dict]) -> None:
    """Sauvegarde les analyses dans le fichier JSON."""
    os.makedirs(TRAINING_DATA_DIR, exist_ok=True)
    with open(ANALYSES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
```

---

## 🧪 Tests

### Test 1 : Suppression réussie

```bash
# 1. Créer une analyse
curl -X POST "http://localhost:8000/questionnaire/analyze" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test de suppression",
    "category": "Industriel",
    "type": "Technique",
    "answers": [...]
  }'

# Récupérer l'ID de la réponse (ex: QA_20260125123146_103)

# 2. Supprimer l'analyse
curl -X DELETE "http://localhost:8000/user/analyses/QA_20260125123146_103" \
  -H "Authorization: Bearer {token}"

# 3. Vérifier que l'analyse n'existe plus
curl -X GET "http://localhost:8000/user/analyses/QA_20260125123146_103" \
  -H "Authorization: Bearer {token}"
# Devrait retourner 404
```

### Test 2 : Tentative de suppression d'une analyse d'un autre utilisateur

```bash
# Avec le token de l'utilisateur A, essayer de supprimer une analyse de l'utilisateur B
curl -X DELETE "http://localhost:8000/user/analyses/{id_user_b}" \
  -H "Authorization: Bearer {token_user_a}"

# Devrait retourner 403 Forbidden
```

### Test 3 : Suppression sans authentification

```bash
curl -X DELETE "http://localhost:8000/user/analyses/QA_20260125123146_103"

# Devrait retourner 401 Unauthorized
```

### Test 4 : Suppression d'une analyse inexistante

```bash
curl -X DELETE "http://localhost:8000/user/analyses/INVALID_ID" \
  -H "Authorization: Bearer {token}"

# Devrait retourner 404 Not Found
```

---

## 📝 Code ajouté

### Fichier modifié : `app/routers/user_router.py`

**Fonction de sauvegarde (lignes 32-36) :**
```python
def _save_analyses(data: List[dict]) -> None:
    """Sauvegarde les analyses dans le fichier JSON."""
    os.makedirs(TRAINING_DATA_DIR, exist_ok=True)
    with open(ANALYSES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
```

**Endpoint DELETE (lignes 175-216) :**
```python
@router.delete("/analyses/{analysis_id}")
async def delete_user_analysis(
    analysis_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Supprime une analyse utilisateur spécifique par son ID.
    Nécessite une authentification Firebase.
    L'utilisateur ne peut supprimer que ses propres analyses.
    """
    user_uid = current_user["uid"]
    print(f"[UserRouter] User {user_uid} attempting to delete analysis {analysis_id}")
    
    data = _load_analyses()
    analysis_found = False
    analysis_index = -1

    for i, analysis in enumerate(data):
        if analysis.get("id") == analysis_id:
            analysis_found = True
            # Vérifier que l'analyse appartient à l'utilisateur
            if analysis.get("user_uid") != user_uid:
                print(f"[UserRouter] Access denied: analysis belongs to {analysis.get('user_uid')}, not {user_uid}")
                raise HTTPException(status_code=403, detail="Accès non autorisé à cette analyse")
            analysis_index = i
            break

    if not analysis_found:
        print(f"[UserRouter] Analysis {analysis_id} not found")
        raise HTTPException(status_code=404, detail=f"Analyse {analysis_id} non trouvée")

    # Supprimer l'analyse
    deleted_analysis = data.pop(analysis_index)
    _save_analyses(data)
    
    print(f"[UserRouter] Successfully deleted analysis {analysis_id}")
    
    return {
        "status": "deleted",
        "id": analysis_id,
        "message": f"Analyse {analysis_id} supprimée avec succès"
    }
```

---

## 🔄 Flux de suppression

```
Client Mobile
    ↓
DELETE /user/analyses/{id}
    ↓
Vérification authentification (Firebase)
    ↓
Chargement du fichier JSON
    ↓
Recherche de l'analyse par ID
    ↓
Vérification user_uid
    ↓
Suppression de l'analyse
    ↓
Sauvegarde du fichier JSON
    ↓
Retour de la confirmation
    ↓
Client Mobile (redirection dashboard)
```

---

## 📊 Codes de statut HTTP

| Code | Signification | Cas d'usage |
|------|---------------|-------------|
| 200  | OK | Suppression réussie |
| 401  | Unauthorized | Token manquant ou invalide |
| 403  | Forbidden | Analyse appartient à un autre utilisateur |
| 404  | Not Found | Analyse inexistante |
| 500  | Internal Server Error | Erreur lors de la sauvegarde |

---

## 🎯 Intégration avec l'application mobile

### Fonction API (déjà créée)

**Fichier :** `lib/api.ts`

```typescript
export const deleteUserAnalysis = async (id: string) => {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/user/analyses/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      ...authHeader,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
};
```

### Utilisation dans l'application

**Fichier :** `app/analysis-details.tsx`

```typescript
const handleDelete = async () => {
  if (!id) return;
  
  setDeleting(true);
  try {
    await deleteUserAnalysis(id);
    setShowDeleteModal(false);
    router.replace("/dashboard");
  } catch (e: any) {
    Alert.alert("Erreur", e?.message || "Impossible de supprimer l'analyse");
    setDeleting(false);
  }
};
```

---

## ✅ Checklist de validation

### Backend
- [x] Endpoint DELETE créé
- [x] Authentification Firebase requise
- [x] Vérification du user_uid
- [x] Gestion des erreurs 404/403
- [x] Sauvegarde du fichier JSON
- [x] Logs de sécurité

### Frontend
- [x] Fonction API créée
- [x] Modal de confirmation
- [x] Gestion des erreurs
- [x] Redirection après suppression

### Tests
- [ ] Test de suppression réussie
- [ ] Test d'accès non autorisé
- [ ] Test sans authentification
- [ ] Test avec ID invalide

---

## 🚀 Déploiement

### Redémarrer le serveur

```bash
cd /home/dango/Documents/projects-safeqore/safeqore_IA

# Arrêter le serveur actuel (Ctrl+C)

# Redémarrer
uvicorn app.main:app --reload --port 8000
```

### Vérifier l'endpoint

```bash
# Vérifier que l'endpoint est disponible
curl -X OPTIONS "http://localhost:8000/user/analyses/test"
```

---

## 📚 Documentation Swagger

L'endpoint est automatiquement documenté dans Swagger UI :

**URL :** http://localhost:8000/docs

**Section :** Analyse Utilisateur

**Méthode :** DELETE /user/analyses/{analysis_id}

---

## 🐛 Résolution du problème

### Problème initial

```
INFO: 127.0.0.1:46526 - "DELETE /user/analyses/QA_20260125123146_103 HTTP/1.1" 405 Method Not Allowed
```

### Cause

L'endpoint DELETE n'existait pas dans le backend.

### Solution

✅ Ajout de l'endpoint `@router.delete("/analyses/{analysis_id}")` dans `user_router.py`

### Résultat attendu

```
INFO: 127.0.0.1:46526 - "DELETE /user/analyses/QA_20260125123146_103 HTTP/1.1" 200 OK
```

---

**Date de création :** 2026-01-25  
**Version :** 1.0.0  
**Statut :** ✅ Prêt pour les tests
