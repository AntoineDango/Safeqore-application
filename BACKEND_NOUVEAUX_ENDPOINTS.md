# Nouveaux Endpoints Backend - Gestion avancée des projets

## 📋 Vue d'ensemble

Trois nouveaux endpoints ont été ajoutés au router `/projects` pour permettre :
1. La mise à jour d'un projet existant
2. La duplication complète d'un projet
3. L'analyse IA comparative de tous les risques

---

## 🔧 Endpoints implémentés

### 1. **PUT** `/projects/{project_id}`

Met à jour les informations d'un projet existant.

**Headers requis:**
```
Authorization: Bearer {firebase_token}
```

**Body (tous les champs sont optionnels):**
```json
{
  "analysis_title": "Nouveau titre du projet",
  "project_description": "Nouvelle description détaillée",
  "entity_type": "PME",
  "entity_services": "Services IT et consulting",
  "sector": "Technologies de l'information"
}
```

**Response 200:**
```json
{
  "id": "PROJ_20260131210000_0",
  "analysis_title": "Nouveau titre du projet",
  "project_description": "Nouvelle description détaillée",
  "project_type": "entity",
  "entity_type": "PME",
  "entity_services": "Services IT et consulting",
  "sector": "Technologies de l'information",
  "risks": [...],
  "user_uid": "abc123",
  "user_email": "user@example.com",
  "created_at": "2026-01-31T20:00:00",
  "updated_at": "2026-01-31T21:00:00",
  "status": "completed"
}
```

**Erreurs:**
- `404`: Projet non trouvé
- `403`: Accès non autorisé (pas le propriétaire)

---

### 2. **POST** `/projects/{project_id}/duplicate`

Duplique un projet avec tous ses risques, évaluations et mesures.

**Headers requis:**
```
Authorization: Bearer {firebase_token}
```

**Body (optionnel):**
```json
{
  "new_title": "Projet copié - Version modifiée"
}
```

Si `new_title` n'est pas fourni, le système ajoute automatiquement `_v2` au titre :
- `Mon Projet` → `Mon Projet_v2`
- `Mon Projet_v2` → `Mon Projet_v3`
- etc.

**Response 200:**
```json
{
  "id": "PROJ_20260131210500_1",
  "analysis_title": "Mon Projet_v2",
  "project_description": "Description identique au projet source",
  "project_type": "project",
  "risks": [
    {
      "id": "PROJ_20260131210500_1_RISK_210501123456",
      "description": "Risque dupliqué 1",
      "category": "Technique",
      "type": "Cyber & SSI",
      "initial_evaluation": {
        "G": 4,
        "F": 3,
        "P": 2,
        "score": 24,
        "level": "Faible"
      },
      "mitigation_measure": "Mesure dupliquée",
      "residual_evaluation": {
        "G": 2,
        "F": 2,
        "P": 2,
        "score": 8,
        "level": "Faible"
      },
      "created_at": "2026-01-31T21:05:01"
    }
  ],
  "user_uid": "abc123",
  "created_at": "2026-01-31T21:05:00",
  "updated_at": "2026-01-31T21:05:00",
  "status": "completed"
}
```

**Caractéristiques:**
- ✅ Tous les risques sont dupliqués avec leurs évaluations
- ✅ Les mesures de contournement sont conservées
- ✅ Les évaluations résiduelles sont préservées
- ✅ Nouveaux IDs générés pour le projet et tous les risques
- ✅ Status `completed` si tous les risques sont complets
- ✅ Dates de création/modification mises à jour

**Erreurs:**
- `404`: Projet source non trouvé
- `403`: Accès non autorisé

---

### 3. **POST** `/projects/{project_id}/ai-analysis`

Lance une analyse IA comparative pour tous les risques du projet.

**Validation préalable automatique:**
- Tous les risques doivent avoir une `mitigation_measure` (non vide)
- Tous les risques doivent avoir une `residual_evaluation` (non null)

**Headers requis:**
```
Authorization: Bearer {firebase_token}
```

**Body:** Aucun

**Response 200:**
```json
{
  "project_id": "PROJ_20260131210000_0",
  "comparisons": [
    {
      "risk_id": "PROJ_20260131210000_0_RISK_123456",
      "risk_description": "Perte de données sensibles suite à une cyberattaque",
      "human_analysis": {
        "G": 4,
        "F": 3,
        "P": 2,
        "score": 24,
        "classification": "Faible"
      },
      "ia_analysis": {
        "G": 5,
        "F": 3,
        "P": 3,
        "score": 45,
        "classification": "Moyen",
        "causes": [
          "Absence de politique de sécurité formalisée",
          "Manque de sensibilisation des employés",
          "Systèmes de sauvegarde inadéquats"
        ],
        "recommendations": [
          "Mettre en place une politique de sécurité des données stricte",
          "Former l'ensemble du personnel aux bonnes pratiques cyber",
          "Implémenter un système de sauvegarde automatique chiffré",
          "Réaliser des audits de sécurité trimestriels"
        ],
        "justification": "Score élevé en raison de la sensibilité des données et de l'impact potentiel"
      },
      "comparison": {
        "agreement_level": "Moyen",
        "classifications_match": false,
        "score_difference": 21,
        "analysis": "Divergence : Humain=Faible, IA=Moyen. Différence de score : 21 points."
      }
    },
    {
      "risk_id": "PROJ_20260131210000_0_RISK_123457",
      "risk_description": "Retard dans la livraison du projet",
      "human_analysis": {
        "G": 3,
        "F": 4,
        "P": 3,
        "score": 36,
        "classification": "Moyen"
      },
      "ia_analysis": {
        "G": 3,
        "F": 3,
        "P": 3,
        "score": 27,
        "classification": "Moyen",
        "causes": [
          "Estimation initiale trop optimiste",
          "Manque de ressources disponibles"
        ],
        "recommendations": [
          "Revoir la méthodologie d'estimation",
          "Ajouter des marges de sécurité dans le planning",
          "Mettre en place un suivi hebdomadaire des avancements"
        ],
        "justification": "Risque modéré car récurrent dans ce type de projet"
      },
      "comparison": {
        "agreement_level": "Élevé",
        "classifications_match": true,
        "score_difference": 9,
        "analysis": "Les deux analyses concordent sur la classification 'Moyen'. Différence de score : 9 points."
      }
    }
  ]
}
```

**Niveau d'accord calculé:**
- **Élevé** : `score_difference <= 10` ET classifications identiques
- **Moyen** : `score_difference <= 25` OU classifications différentes mais score proche
- **Faible** : `score_difference > 25`

**Erreurs:**
- `404`: Projet non trouvé
- `403`: Accès non autorisé
- `400`: Projet sans risques
- `400`: Risques incomplets (message détaillé avec le nombre de risques manquants)
- `500`: Échec de l'analyse IA pour tous les risques

**Note:** Si l'analyse IA échoue pour un risque individuel, il est ignoré et les autres risques continuent d'être analysés. L'erreur 500 n'est retournée que si **aucun** risque n'a pu être analysé.

---

## 🧪 Tests manuels

### Test 1 : Mise à jour d'un projet

```bash
# 1. Créer un projet
curl -X POST http://localhost:8000/projects/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_type": "entity",
    "project_description": "Description initiale",
    "analysis_title": "Projet Test",
    "sector": "IT"
  }'

# Réponse : noter le project_id

# 2. Mettre à jour le projet
curl -X PUT http://localhost:8000/projects/PROJ_XXX \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "analysis_title": "Projet Test Modifié",
    "sector": "Finance"
  }'

# Vérifier que seuls les champs modifiés ont changé
```

---

### Test 2 : Duplication d'un projet complet

```bash
# 1. Récupérer un projet existant avec des risques
curl -X GET http://localhost:8000/projects/PROJ_XXX \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Dupliquer le projet
curl -X POST http://localhost:8000/projects/PROJ_XXX/duplicate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# 3. Vérifier que :
# - Un nouveau project_id est créé
# - Le titre contient "_v2"
# - Tous les risques sont dupliqués avec de nouveaux IDs
# - Les évaluations sont identiques au projet source

# 4. Dupliquer à nouveau pour tester l'incrémentation
curl -X POST http://localhost:8000/projects/PROJ_XXX/duplicate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Vérifier que le titre contient maintenant "_v3"
```

---

### Test 3 : Analyse IA comparative

```bash
# 1. Créer un projet avec 4 risques complets (avec mesures et évaluations résiduelles)
# Utiliser le frontend ou créer manuellement via l'API

# 2. Lancer l'analyse IA
curl -X POST http://localhost:8000/projects/PROJ_XXX/ai-analysis \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Vérifier la réponse :
# - Chaque risque a une comparaison Humain vs IA
# - Les causes et recommandations IA sont présentes
# - Le niveau d'accord est calculé
# - Les scores et classifications sont cohérents

# 4. Tester avec un projet incomplet (sans mesures)
curl -X POST http://localhost:8000/projects/PROJ_INCOMPLET/ai-analysis \
  -H "Authorization: Bearer YOUR_TOKEN"

# Doit retourner une erreur 400 avec le nombre de risques incomplets
```

---

## 🔍 Validations implémentées

### Endpoint PUT `/projects/{project_id}`
- ✅ Vérification de l'authentification
- ✅ Vérification de l'existence du projet
- ✅ Vérification de la propriété (user_uid)
- ✅ Validation des champs (longueur minimale si fournis)
- ✅ Mise à jour de `updated_at`

### Endpoint POST `/projects/{project_id}/duplicate`
- ✅ Vérification de l'authentification
- ✅ Vérification de l'existence du projet source
- ✅ Vérification de la propriété
- ✅ Génération d'IDs uniques (projet + risques)
- ✅ Gestion intelligente du versioning (_v2, _v3, etc.)
- ✅ Copie profonde de toutes les données
- ✅ Mise à jour du statut selon la complétude

### Endpoint POST `/projects/{project_id}/ai-analysis`
- ✅ Vérification de l'authentification
- ✅ Vérification de l'existence du projet
- ✅ Vérification de la propriété
- ✅ Validation : projet avec au moins 1 risque
- ✅ Validation : tous les risques ont une mesure
- ✅ Validation : tous les risques ont une évaluation résiduelle
- ✅ Gestion des erreurs IA individuelles (skip le risque)
- ✅ Calcul automatique du niveau d'accord
- ✅ Classification Kinney appliquée aux résultats IA

---

## 📊 Structure de données

### Comparaison Humain vs IA

```typescript
interface ComparisonResult {
  agreement_level: "Élevé" | "Moyen" | "Faible";
  classifications_match: boolean;
  score_difference: number;
  analysis: string; // Texte explicatif
}
```

### Algorithme de calcul du niveau d'accord

```python
score_diff = abs(human_score - ia_score)
classifications_match = (human_classification == ia_classification)

if score_diff <= 10 and classifications_match:
    agreement_level = "Élevé"
elif score_diff <= 25:
    agreement_level = "Moyen"
else:
    agreement_level = "Faible"
```

---

## 🚀 Intégration frontend

Les endpoints sont déjà intégrés dans le frontend :

**Fichier:** `/lib/api.ts`

```typescript
// Mise à jour
updateProject(projectId, data)

// Duplication
duplicateProject(projectId, newTitle?)

// Analyse IA
analyzeProjectWithIA(projectId)
```

**Fichier:** `/app/saved-project-view.tsx`

- Bouton "Modifier le projet" → Modal d'édition → `updateProject()`
- Bouton "Dupliquer le projet" → `duplicateProject()`
- Bouton "Lancer analyse IA" → `analyzeProjectWithIA()` → Export Excel comparatif

---

## 📝 Notes techniques

### Performance
- L'analyse IA peut prendre **plusieurs secondes** selon le nombre de risques
- Chaque risque nécessite un appel au LLM (Groq)
- Timeout recommandé : 60 secondes

### Sécurité
- Tous les endpoints vérifient l'authentification Firebase
- Tous les endpoints vérifient la propriété du projet (user_uid)
- Validation stricte des données entrantes (Pydantic)

### Stockage
- Les projets sont stockés dans `training/data/analysis_projects.json`
- Format JSON avec indentation pour faciliter le debug
- Backup recommandé avant tests de duplication

---

## ✅ Checklist de déploiement

- [x] Schémas Pydantic ajoutés dans `project_schemas.py`
- [x] 3 endpoints implémentés dans `project_router.py`
- [x] Import du service LLM pour l'analyse IA
- [x] Gestion des erreurs et validations
- [x] Logs de debug pour le monitoring
- [x] Documentation complète créée

### À faire côté frontend :
- [ ] Installer les dépendances : `npm install` (xlsx, expo-file-system, expo-sharing)
- [ ] Tester l'export Excel sur web
- [ ] Tester l'export Excel sur mobile
- [ ] Vérifier les validations (projet incomplet)

---

## 🐛 Troubleshooting

### Erreur "GROQ_API_KEY not set"
→ Vérifier que la variable d'environnement est définie dans `.env`

### Erreur 400 "Risques incomplets"
→ Vérifier que tous les risques ont :
  - `mitigation_measure` non vide
  - `residual_evaluation` non null

### Erreur 500 "Impossible d'analyser les risques"
→ Vérifier :
  - La clé API Groq est valide
  - Le modèle LLM est accessible
  - Les logs backend pour plus de détails

### Export Excel ne fonctionne pas
→ Vérifier que les dépendances sont installées :
```bash
npm install xlsx expo-file-system expo-sharing
```

---

## 📞 Support

Pour toute question :
1. Consulter les logs backend : `tail -f logs/backend.log`
2. Tester les endpoints avec Postman/Insomnia
3. Vérifier la documentation Pydantic et FastAPI
