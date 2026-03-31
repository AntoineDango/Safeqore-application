# Configuration du nombre de risques générés par l'IA

## 🎯 Problème résolu

Auparavant, l'IA générait toujours **4-6 risques** quel que soit le nombre demandé dans le prompt. Cela était dû à :
1. Une limite fixe dans le prompt
2. Une limite de tokens de sortie du modèle LLM (~4096 tokens)
3. Troncature du JSON quand trop de risques étaient demandés

## ✅ Solution implémentée

### Backend (`/analyze/project`)

**Paramètre `num_risks`** ajouté à la requête :
```python
class ProjectAnalysisRequest(BaseModel):
    analysis_title: str
    description: str
    sector: Optional[str] = None
    entity_services: Optional[str] = None
    num_risks: int = Field(default=6, ge=1, le=15)  # 1-15 risques
```

**Configuration dynamique de `max_tokens`** :
```python
# ~500 tokens par risque + 1000 tokens de marge
max_tokens = min(8192, 1000 + (request.num_risks * 500))
```

**Prompt adaptatif** :
```python
Identifie EXACTEMENT {request.num_risks} risques SPECIFIQUES à ce projet.
```

### Frontend

**Paramètre optionnel `numRisks`** :
```typescript
const analyzeProjectWithAI = async (
  projectData: {
    description: string;
    entityServices?: string;
    sector?: string;
    projectType?: string;
    analysisTitle: string;
    numRisks?: number; // Nouveau paramètre (défaut: 6)
  }
): Promise<RiskRecommendationItem[]>
```

## 📊 Utilisation

### Exemple 1 : Demander 10 risques

**Frontend** :
```typescript
const risks = await analyzeProjectWithAI({
  description: "Projet de migration cloud",
  analysisTitle: "Migration AWS",
  sector: "Technologie",
  numRisks: 10  // ✅ Demander 10 risques
});
```

**Backend API** :
```bash
curl -X POST http://localhost:8000/analyze/project \
  -H "Content-Type: application/json" \
  -d '{
    "analysis_title": "Migration AWS",
    "description": "Projet de migration cloud",
    "sector": "Technologie",
    "num_risks": 10
  }'
```

### Exemple 2 : Utiliser la valeur par défaut (6 risques)

```typescript
const risks = await analyzeProjectWithAI({
  description: "Projet de migration cloud",
  analysisTitle: "Migration AWS",
  sector: "Technologie"
  // numRisks non spécifié = 6 par défaut
});
```

## 🔍 Logs de diagnostic

Le système affiche maintenant des logs détaillés :

```
[AI Project Analysis] Demandé: 10 risques
[AI Project Analysis] Max tokens configuré: 6000
[AI Project Analysis] Taille de la réponse: 8543 caractères
[AI Project Analysis] ✅ Risques reçus: 10/10
[AI Project Analysis] ✅ Nombre de risques exact!
[AI Project Analysis] Recommandations générales: 4
```

**En cas de troncature** :
```
[AI Project Analysis] ⚠️ ATTENTION: Réponse possiblement tronquée!
[AI Project Analysis] ⚠️ Manque 3 risque(s)
[AI Project Analysis] 💡 Suggestion: Réduire num_risks ou augmenter max_tokens
```

## ⚙️ Limites et recommandations

| Nombre de risques | Max tokens | Recommandation |
|-------------------|------------|----------------|
| 1-5 risques       | 3500       | ✅ Optimal     |
| 6-8 risques       | 5000       | ✅ Recommandé  |
| 9-12 risques      | 7000       | ⚠️ Acceptable  |
| 13-15 risques     | 8500       | ⚠️ Limite max  |
| 16+ risques       | -          | ❌ Non supporté |

**Note** : La limite de 15 risques est une protection contre :
- Les timeouts API
- Les coûts excessifs (chaque risque appelle aussi l'API de comparaison)
- Les temps de traitement trop longs

## 🐛 Dépannage

### Problème : Je reçois moins de risques que demandé

**Causes possibles** :
1. Réponse LLM tronquée (limite de tokens)
2. Erreur de parsing JSON
3. Risques invalides filtrés

**Solutions** :
1. Vérifier les logs backend pour voir les warnings
2. Réduire `num_risks` à une valeur plus faible
3. Augmenter `max_tokens` manuellement si nécessaire

### Problème : Timeout ou erreur 502

**Cause** : Trop de risques demandés, temps de traitement trop long

**Solution** : Réduire `num_risks` à 10 ou moins

## 📝 Variables d'environnement

Aucune nouvelle variable requise. Les variables existantes s'appliquent :

```env
GROQ_API_KEY=your_api_key
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_TEMPERATURE=0.15
```

## 🔄 Migration

**Aucune migration nécessaire** : Le paramètre `num_risks` est optionnel avec une valeur par défaut de 6.

Les appels existants continuent de fonctionner sans modification.
