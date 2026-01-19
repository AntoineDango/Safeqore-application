# Guide de Tests Manuels - SafeQore API

Ce guide fournit des données de test pour vérifier le bon fonctionnement de l'API SafeQore étape par étape, conformément au cahier des charges STB.

## Prérequis

1. Démarrer le serveur :
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 4000
```

2. L'API sera accessible à : `http://localhost:4000`

---

## Étape 1 : Tests de Santé de l'API

### 1.1 Vérifier que l'API est en ligne

**Endpoint :** `GET /`

```bash
curl http://localhost:4000/
```

**Réponse attendue :**
```json
{
  "name": "SafeQore API",
  "version": "1.1.0",
  "description": "Solution d'analyse des risques assistée par IA",
  "endpoints": {
    "analyze": "/hybrid-analyze",
    "enrichment": "/enrichment",
    "docs": "/docs"
  }
}
```

### 1.2 Vérifier l'état de santé

**Endpoint :** `GET /health`

```bash
curl http://localhost:4000/health
```

**Réponse attendue :**
```json
{
  "status": "healthy"
}
```

### 1.3 Accéder à la documentation

- Swagger UI : http://localhost:4000/docs
- ReDoc : http://localhost:4000/redoc

---

## Étape 2 : Récupérer les Constantes (STB)

### 2.1 Obtenir les catégories, types et secteurs valides

**Endpoint :** `GET /enrichment/constants`

```bash
curl http://localhost:4000/enrichment/constants
```

**Réponse attendue :**
```json
{
  "categories": ["Projet/Programme", "Industriel", "Qualité"],
  "types": ["Commercial", "Financier", "Technique", "Cyber & SSI"],
  "sectors": [
    "Mobilité et Transport",
    "Agriculture",
    "Technologie",
    "Innovation",
    "Startup",
    "TPE",
    "PME",
    "ETI"
  ]
}
```

---

## Étape 3 : Tests d'Analyse de Risques (/hybrid-analyze)

### 3.1 Risque Cyber & SSI - Secteur Technologie (Risque Élevé)

**Endpoint :** `POST /hybrid-analyze`

```bash
curl -X POST http://localhost:4000/hybrid-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Cyberattaque par ransomware sur les serveurs de production contenant les données clients sensibles. Absence de sauvegardes externalisées et de plan de reprise d activité.",
    "category": "Industriel",
    "type": "Cyber & SSI",
    "sector": "Technologie"
  }'
```

**Réponse attendue (exemple) :**
```json
{
  "G": 5,
  "F": 3,
  "P": 4,
  "score": 60,
  "classification": "Eleve",
  "ml_classification": "Eleve",
  "llm_recommendation": "Mettre en place immédiatement un plan de sauvegarde externalisée..."
}
```

### 3.2 Risque Commercial - Secteur PME (Risque Moyen)

```bash
curl -X POST http://localhost:4000/hybrid-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Perte potentielle d un client majeur représentant 15% du chiffre d affaires suite à une insatisfaction sur les délais de livraison.",
    "category": "Projet/Programme",
    "type": "Commercial",
    "sector": "PME"
  }'
```

**Réponse attendue (exemple) :**
```json
{
  "G": 4,
  "F": 2,
  "P": 3,
  "score": 24,
  "classification": "Faible",
  "ml_classification": "Faible",
  "llm_recommendation": "Améliorer la communication client et mettre en place un suivi..."
}
```

### 3.3 Risque Technique - Secteur Mobilité et Transport (Risque Moyen)

```bash
curl -X POST http://localhost:4000/hybrid-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Panne du système de géolocalisation des véhicules de la flotte. Impact sur la planification des livraisons et la satisfaction client.",
    "category": "Industriel",
    "type": "Technique",
    "sector": "Mobilité et Transport"
  }'
```

### 3.4 Risque Financier - Secteur Startup (Risque Élevé)

```bash
curl -X POST http://localhost:4000/hybrid-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Échec de la levée de fonds série A. Trésorerie insuffisante pour couvrir les 6 prochains mois d exploitation. Risque de cessation d activité.",
    "category": "Projet/Programme",
    "type": "Financier",
    "sector": "Startup"
  }'
```

### 3.5 Risque Qualité - Secteur Agriculture (Risque Faible)

```bash
curl -X POST http://localhost:4000/hybrid-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Non-conformité mineure sur l étiquetage des produits biologiques. Absence de mention de l origine sur certains lots.",
    "category": "Qualité",
    "type": "Technique",
    "sector": "Agriculture"
  }'
```

---

## Étape 4 : Tests du Système de Feedback

### 4.1 Soumettre un feedback avec correction de classification

**Endpoint :** `POST /enrichment/feedback`

```bash
curl -X POST http://localhost:4000/enrichment/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Risque de fuite de données personnelles suite à une mauvaise configuration du pare-feu",
    "category": "Industriel",
    "type": "Cyber & SSI",
    "G": 5,
    "F": 2,
    "P": 4,
    "user_classification": "Eleve",
    "sector": "Technologie",
    "mitigation": "Audit de sécurité et reconfiguration du pare-feu avec règles strictes"
  }'
```

**Réponse attendue :**
```json
{
  "id": "fb_xxxxxx",
  "timestamp": "2025-12-29T...",
  "score": 40,
  "computed_classification": "Moyen",
  "user_classification": "Eleve",
  "message": "Feedback enregistré avec succès"
}
```

### 4.2 Feedback sans classification utilisateur (utilise la classification calculée)

```bash
curl -X POST http://localhost:4000/enrichment/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Retard dans la livraison du module de facturation",
    "category": "Projet/Programme",
    "type": "Technique",
    "G": 3,
    "F": 3,
    "P": 2,
    "sector": "PME"
  }'
```

### 4.3 Consulter les statistiques de feedback

**Endpoint :** `GET /enrichment/feedback/stats`

```bash
curl http://localhost:4000/enrichment/feedback/stats
```

### 4.4 Lister les feedbacks enregistrés

**Endpoint :** `GET /enrichment/feedback/list`

```bash
# Premiers 10 feedbacks
curl "http://localhost:4000/enrichment/feedback/list?limit=10&offset=0"
```

---

## Étape 5 : Tests du Système d'Entraînement

### 5.1 Vérifier le statut d'entraînement

**Endpoint :** `GET /enrichment/status`

```bash
curl http://localhost:4000/enrichment/status
```

**Réponse attendue :**
```json
{
  "is_training": false,
  "feedback_data": {
    "total": 10,
    "pending_training": 5
  },
  "scenarios_count": 50,
  "last_training": "2025-12-29T..."
}
```

### 5.2 Déclencher un ré-entraînement (synchrone)

**Endpoint :** `POST /enrichment/retrain`

```bash
curl -X POST http://localhost:4000/enrichment/retrain
```

### 5.3 Déclencher un ré-entraînement (asynchrone)

**Endpoint :** `POST /enrichment/retrain/async`

```bash
curl -X POST http://localhost:4000/enrichment/retrain/async
```

---

## Étape 6 : Tests de Validation des Entrées

### 6.1 Test avec catégorie invalide (doit échouer)

```bash
curl -X POST http://localhost:4000/enrichment/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test",
    "category": "CatégorieInvalide",
    "type": "Technique",
    "G": 3,
    "F": 3,
    "P": 3
  }'
```

**Réponse attendue (400) :**
```json
{
  "detail": "Catégorie invalide. Valeurs acceptées: ['Projet/Programme', 'Industriel', 'Qualité']"
}
```

### 6.2 Test avec type invalide (doit échouer)

```bash
curl -X POST http://localhost:4000/enrichment/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test",
    "category": "Industriel",
    "type": "TypeInvalide",
    "G": 3,
    "F": 3,
    "P": 3
  }'
```

### 6.3 Test avec valeur G hors plage (doit échouer)

```bash
curl -X POST http://localhost:4000/enrichment/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test",
    "category": "Industriel",
    "type": "Technique",
    "G": 10,
    "F": 3,
    "P": 3
  }'
```

**Réponse attendue (422) :** Erreur de validation Pydantic

---

## Étape 7 : Scénarios de Test Complets par Secteur

### 7.1 Scénario Mobilité et Transport

| Test | Description | Catégorie | Type | Classification Attendue |
|------|-------------|-----------|------|------------------------|
| MT-1 | Accident de véhicule de livraison | Industriel | Technique | Moyen/Eleve |
| MT-2 | Grève des transporteurs | Projet/Programme | Commercial | Moyen |
| MT-3 | Piratage du système de tracking GPS | Industriel | Cyber & SSI | Eleve |

### 7.2 Scénario Agriculture

| Test | Description | Catégorie | Type | Classification Attendue |
|------|-------------|-----------|------|------------------------|
| AG-1 | Contamination des récoltes | Qualité | Technique | Eleve |
| AG-2 | Perte de certification bio | Qualité | Commercial | Moyen |
| AG-3 | Défaillance système d'irrigation automatisé | Industriel | Technique | Moyen |

### 7.3 Scénario Technologie

| Test | Description | Catégorie | Type | Classification Attendue |
|------|-------------|-----------|------|------------------------|
| TE-1 | Faille de sécurité zero-day | Industriel | Cyber & SSI | Eleve |
| TE-2 | Indisponibilité du cloud provider | Industriel | Technique | Eleve |
| TE-3 | Départ d'un développeur clé | Projet/Programme | Commercial | Moyen |

### 7.4 Scénario Startup

| Test | Description | Catégorie | Type | Classification Attendue |
|------|-------------|-----------|------|------------------------|
| ST-1 | Échec levée de fonds | Projet/Programme | Financier | Eleve |
| ST-2 | Pivotement stratégique forcé | Projet/Programme | Commercial | Moyen |
| ST-3 | Non-conformité RGPD | Qualité | Cyber & SSI | Moyen/Eleve |

---

## Étape 8 : Vérification de la Méthodologie Kinney

### Tableau de référence des scores

| Score (G×F×P) | Classification | Action Requise |
|---------------|----------------|----------------|
| 1 - 25 | **Faible** | Mesure à prendre à long terme |
| 26 - 50 | **Moyen** | Attention requise, mesures à court/moyen terme |
| 51 - 125 | **Eleve** | Prendre des mesures immédiates |

### Tests de validation des seuils

```bash
# Score = 1 (1×1×1) → Faible
curl -X POST http://localhost:4000/enrichment/feedback \
  -H "Content-Type: application/json" \
  -d '{"description": "Risque minimal", "category": "Qualité", "type": "Technique", "G": 1, "F": 1, "P": 1}'

# Score = 25 (5×5×1) → Faible (limite haute)
curl -X POST http://localhost:4000/enrichment/feedback \
  -H "Content-Type: application/json" \
  -d '{"description": "Risque limite faible", "category": "Qualité", "type": "Technique", "G": 5, "F": 5, "P": 1}'

# Score = 27 (3×3×3) → Moyen
curl -X POST http://localhost:4000/enrichment/feedback \
  -H "Content-Type: application/json" \
  -d '{"description": "Risque moyen", "category": "Industriel", "type": "Technique", "G": 3, "F": 3, "P": 3}'

# Score = 50 (5×5×2) → Moyen (limite haute)
curl -X POST http://localhost:4000/enrichment/feedback \
  -H "Content-Type: application/json" \
  -d '{"description": "Risque limite moyen", "category": "Industriel", "type": "Technique", "G": 5, "F": 5, "P": 2}'

# Score = 51 → Eleve (limite basse)
# Note: 51 n'est pas atteignable exactement, le plus proche est 54 (3×3×6) mais P max=5
# Donc on prend 60 (3×4×5)
curl -X POST http://localhost:4000/enrichment/feedback \
  -H "Content-Type: application/json" \
  -d '{"description": "Risque élevé", "category": "Industriel", "type": "Cyber & SSI", "G": 3, "F": 4, "P": 5}'

# Score = 125 (5×5×5) → Eleve (maximum)
curl -X POST http://localhost:4000/enrichment/feedback \
  -H "Content-Type: application/json" \
  -d '{"description": "Risque critique maximal", "category": "Industriel", "type": "Cyber & SSI", "G": 5, "F": 5, "P": 5}'
```

---

## Résumé des Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Information API |
| GET | `/health` | État de santé |
| GET | `/docs` | Documentation Swagger |
| GET | `/enrichment/constants` | Constantes STB |
| POST | `/hybrid-analyze` | Analyse de risque hybride |
| POST | `/enrichment/feedback` | Soumettre un feedback |
| GET | `/enrichment/feedback/stats` | Statistiques feedbacks |
| GET | `/enrichment/feedback/list` | Liste des feedbacks |
| GET | `/enrichment/status` | Statut entraînement |
| POST | `/enrichment/retrain` | Ré-entraînement sync |
| POST | `/enrichment/retrain/async` | Ré-entraînement async |
