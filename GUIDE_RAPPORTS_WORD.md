# 📊 Guide d'utilisation des Rapports Word

## Vue d'ensemble

Les rapports Word ont été améliorés pour afficher le score sur **100** (au lieu de 125) et incluent maintenant des **graphiques visuels interactifs**.

## 🎯 Endpoints disponibles

### 1. Rapport de comparaison Humain vs IA
**Endpoint :** `POST /compare/report`

**Description :** Génère un rapport comparant l'analyse de l'utilisateur avec celle de l'IA.

**Exemple de requête :**
```bash
curl -X POST "http://localhost:8000/compare/report" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Risque de cyberattaque sur le système de paiement",
    "category": "Industriel",
    "type": "Cyber & SSI",
    "sector": "Technologie",
    "user_G": 4,
    "user_F": 2,
    "user_P": 4
  }' \
  --output rapport_comparaison.docx
```

**Contenu du rapport :**
- ✅ Analyse utilisateur avec score sur 100
- ✅ Analyse IA avec score sur 100
- ✅ Graphiques comparatifs G/F/P
- ✅ Graphique du score global
- ✅ Écart entre utilisateur et IA

### 2. Rapport de questionnaire
**Endpoint :** `GET /questionnaire/{analysis_id}/report`

**Description :** Génère un rapport complet pour une analyse de questionnaire.

**Exemple de requête :**
```bash
# D'abord créer une analyse
curl -X POST "http://localhost:8000/questionnaire/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Analyse de risque industriel",
    "category": "Industriel",
    "type": "Mécanique",
    "sector": "Manufacturing",
    "method": "Questionnaire",
    "answers": {
      "G": {"Q1": 4, "Q2": 3, "Q3": 5},
      "F": {"Q1": 2, "Q2": 2, "Q3": 3},
      "P": {"Q1": 4, "Q2": 4, "Q3": 3}
    }
  }'

# Puis télécharger le rapport (remplacer {id} par l'ID retourné)
curl "http://localhost:8000/questionnaire/{id}/report" \
  --output rapport_questionnaire.docx
```

**Contenu du rapport :**
- ✅ Contexte de l'analyse
- ✅ Analyse utilisateur avec score sur 100
- ✅ Graphique du score global
- ✅ Tableau des facteurs G/F/P avec barres
- ✅ Analyse IA (si disponible)
- ✅ Comparaison utilisateur vs IA
- ✅ Mesures et risques résiduels
- ✅ Matrice de risques G×P

## 📈 Exemples de visualisations

### Score Global (sur 100)

**Score faible (20/100) :**
```
Score: 20/100  |  ██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Classification: Faible
```

**Score moyen (40/100) :**
```
Score: 40/100  |  ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Classification: Moyen
```

**Score élevé (80/100) :**
```
Score: 80/100  |  ████████████████████████████████████████░░░░░░░░░░
Classification: Élevé
```

### Facteurs G, F, P

```
┌─────────────────┬──────────────────────┐
│ Facteur         │ Valeur (sur 5)       │
├─────────────────┼──────────────────────┤
│ G (Gravité)     │ 5/5  |  ████████████████████ │
│ F (Fréquence)   │ 3/5  |  ████████████░░░░░░░░ │
│ P (Probabilité) │ 4/5  |  ████████████████░░░░ │
└─────────────────┴──────────────────────┘
```

### Comparaison Utilisateur vs IA

```
┌─────────────────┬──────────────┬──────┐
│                 │ Utilisateur  │ IA   │
├─────────────────┼──────────────┼──────┤
│ Score /100      │ 48           │ 56   │
│ Classification  │ Moyen        │ Élevé│
└─────────────────┴──────────────┴──────┘

Écart de score: 8 points (sur 100)
```

## 🔄 Correspondance des scores

### Tableau de conversion 125 → 100

| Score /125 | Score /100 | Classification |
|------------|------------|----------------|
| 1-25       | 1-20       | Faible         |
| 26-50      | 21-40      | Moyen          |
| 51-75      | 41-60      | Moyen          |
| 76-100     | 61-80      | Élevé          |
| 101-125    | 81-100     | Élevé          |

### Exemples de conversion

| G | F | P | Score /125 | Score /100 | Classification |
|---|---|---|------------|------------|----------------|
| 1 | 1 | 1 | 1          | 1          | Faible         |
| 2 | 2 | 2 | 8          | 6          | Faible         |
| 3 | 3 | 3 | 27         | 22         | Moyen          |
| 4 | 2 | 4 | 32         | 26         | Moyen          |
| 4 | 4 | 4 | 64         | 51         | Élevé          |
| 5 | 5 | 5 | 125        | 100        | Élevé          |

## 🧪 Test rapide

### Option 1 : Via l'interface Swagger

1. Ouvrir http://localhost:8000/docs
2. Aller à l'endpoint `/compare/report`
3. Cliquer sur "Try it out"
4. Entrer les données :
   ```json
   {
     "description": "Test de rapport",
     "category": "Industriel",
     "type": "Cyber & SSI",
     "user_G": 4,
     "user_F": 2,
     "user_P": 4
   }
   ```
5. Cliquer sur "Execute"
6. Télécharger le fichier `.docx` généré

### Option 2 : Via le script de test

```bash
cd /home/dango/Documents/projects-safeqore/safeqore_IA
python test_rapport_word.py
```

Le script génère automatiquement :
- `test_compare_report.docx`
- `test_questionnaire_report.docx`

### Option 3 : Via curl

```bash
# Rapport de comparaison
curl -X POST "http://localhost:8000/compare/report" \
  -H "Content-Type: application/json" \
  -d '{"description":"Test","category":"Industriel","type":"Cyber & SSI","user_G":4,"user_F":2,"user_P":4}' \
  --output test.docx

# Ouvrir le fichier
xdg-open test.docx  # Linux
# ou
open test.docx      # macOS
# ou
start test.docx     # Windows
```

## ✅ Checklist de vérification

Après avoir généré un rapport, vérifier :

### Contenu
- [ ] Le score est affiché sur 100 (pas 125)
- [ ] La classification est correcte (Faible/Moyen/Élevé)
- [ ] Les valeurs G, F, P sont affichées

### Graphiques
- [ ] Le graphique du score global s'affiche
- [ ] Les barres sont proportionnelles au score
- [ ] Le tableau des facteurs G/F/P est présent
- [ ] Les barres des facteurs sont visibles

### Comparaison (si applicable)
- [ ] Le tableau comparatif utilisateur vs IA est présent
- [ ] L'écart est calculé en points sur 100
- [ ] Les deux scores sont normalisés sur 100

### Format
- [ ] Le fichier s'ouvre dans Word/LibreOffice
- [ ] Les tableaux sont bien formatés
- [ ] Les caractères Unicode (█ ░) s'affichent correctement
- [ ] Le document est professionnel

## 🎨 Personnalisation

### Modifier la longueur des barres

Dans `compare_router.py` ou `questionnaire_router.py` :

```python
# Barre du score (actuellement 50 caractères)
def score_bar(val: int, max_val: int = 100, length: int = 50):
    # Changer length pour ajuster la longueur

# Barre des facteurs (actuellement 20 caractères)
def factor_bar(val: int, max_val: int = 5, length: int = 20):
    # Changer length pour ajuster la longueur
```

### Modifier les seuils de classification

Dans `app/constants.py` :

```python
RISK_CLASSES = {
    "Faible": {"min": 0, "max": 25, "action": "..."},
    "Moyen": {"min": 26, "max": 50, "action": "..."},
    "Eleve": {"min": 51, "max": 125, "action": "..."}
}
```

## 🐛 Dépannage

### Le rapport ne se génère pas

**Problème :** Erreur 500 lors de la génération

**Solution :**
1. Vérifier que le serveur est démarré
2. Vérifier les logs du serveur
3. Vérifier que les données sont valides (G, F, P entre 1 et 5)

### Les graphiques ne s'affichent pas

**Problème :** Les barres apparaissent comme des carrés vides

**Solution :**
1. Utiliser une police compatible Unicode (Arial, Calibri, etc.)
2. Ouvrir avec un lecteur Word récent
3. Vérifier l'encodage du document (UTF-8)

### Le score est incorrect

**Problème :** Le score ne correspond pas au calcul G×F×P

**Solution :**
1. Vérifier que la normalisation est appliquée : `score / 125 * 100`
2. Vérifier que les valeurs G, F, P sont correctes
3. Consulter le tableau de conversion ci-dessus

## 📞 Support

Pour toute question ou problème :

1. Consulter la documentation : `RAPPORT_WORD_AMELIORATIONS.md`
2. Vérifier les logs du serveur
3. Exécuter le script de test : `python test_rapport_word.py`
4. Consulter les exemples de rapports générés

## 🚀 Prochaines étapes

Pour améliorer encore les rapports :

1. **Graphiques images** : Intégrer matplotlib pour de vrais graphiques
2. **Couleurs** : Ajouter des couleurs aux cellules selon le risque
3. **Export PDF** : Générer aussi des PDF
4. **Templates** : Permettre la personnalisation des templates
5. **Logo** : Ajouter un logo d'entreprise

---

**Version :** 2.0.0  
**Date :** 2026-01-25  
**Statut :** ✅ Production ready
