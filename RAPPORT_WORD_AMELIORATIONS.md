# Améliorations des Rapports Word - Score sur 100 et Graphiques

## Modifications effectuées

### 1. Normalisation du score sur 100 (au lieu de 125)

Tous les rapports Word affichent maintenant le score normalisé sur 100 au lieu de 125, conformément aux exigences.

**Formule de normalisation :**
```python
score_normalized = int(round(score / 125 * 100))
```

**Exemple :**
- Avant : `G: 4 F: 2 P: 4 Score: 32 / 125`
- Après : `G: 4 F: 2 P: 4 Score: 26 / 100`

### 2. Ajout de graphiques visuels interactifs

Les rapports Word incluent maintenant des visualisations graphiques sous forme de barres textuelles :

#### a) Graphique du score global (sur 100)
```
Score: 26/100  |  █████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

#### b) Graphiques des facteurs G, F, P (sur 5)
```
┌─────────────────┬──────────────────────┐
│ Facteur         │ Valeur (sur 5)       │
├─────────────────┼──────────────────────┤
│ G (Gravité)     │ 4/5  |  ████████████████░░░░ │
│ F (Fréquence)   │ 2/5  |  ████████░░░░░░░░░░░░ │
│ P (Probabilité) │ 4/5  |  ████████████████░░░░ │
└─────────────────┴──────────────────────┘
```

#### c) Tableau comparatif Utilisateur vs IA
```
┌─────────────────┬──────────────┬──────┐
│                 │ Utilisateur  │ IA   │
├─────────────────┼──────────────┼──────┤
│ Score /100      │ 26           │ 32   │
│ Classification  │ Moyen        │ Moyen│
└─────────────────┴──────────────┴──────┘
```

### 3. Fichiers modifiés

#### `/app/routers/compare_router.py`
- ✅ Normalisation des scores utilisateur et IA sur 100
- ✅ Ajout d'un graphique de score global avec barres visuelles
- ✅ Graphiques comparatifs G/F/P entre utilisateur et IA
- ✅ Écart de score affiché en points sur 100

**Lignes modifiées :**
- Ligne 286-288 : Calcul des scores normalisés
- Ligne 298 : Affichage score utilisateur sur 100
- Ligne 302 : Affichage score IA sur 100
- Ligne 337-353 : Nouveau graphique du score global
- Ligne 357 : Écart en points sur 100

#### `/app/routers/questionnaire_router.py`
- ✅ Affichage du score normalisé sur 100 (au lieu de 125)
- ✅ Graphique visuel du score global
- ✅ Tableau détaillé des facteurs G, F, P avec barres
- ✅ Normalisation du score IA sur 100
- ✅ Tableau comparatif utilisateur vs IA

**Lignes modifiées :**
- Ligne 483-484 : Affichage score sur 100
- Ligne 488-494 : Graphique du score global
- Ligne 496-516 : Tableau des facteurs G/F/P
- Ligne 498-501 : Score IA normalisé sur 100
- Ligne 510-523 : Tableau comparatif

## Exemples de rapports générés

### Rapport de comparaison (`/compare/report`)

```
Comparaison Humain vs IA
========================

Description: Risque de cyberattaque sur le système de paiement

Analyse Utilisateur
-------------------
G: 4  F: 2  P: 4
Score: 26 / 100  |  Classification: Moyen

Analyse IA
----------
G: 4  F: 3  P: 4
Score: 38 / 100  |  Classification: Moyen

Graphiques comparatifs (G/F/P)
------------------------------
[Tableau avec barres visuelles pour chaque facteur]

Score Global (sur 100)
----------------------
Utilisateur: 26/100  |  █████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
IA:          38/100  |  ███████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

Comparaison & Écarts
--------------------
Écart score: 12 points (sur 100)
```

### Rapport de questionnaire (`/questionnaire/{id}/report`)

```
Rapport d'analyse de risque
===========================

Analyse utilisateur
-------------------
Méthode: Questionnaire
G: 4  F: 2  P: 4
Score: 26 / 100
Classification: Moyen
Visualisation: █████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

Détail des facteurs
-------------------
[Tableau avec G, F, P et barres visuelles]

Analyse IA (assistance)
-----------------------
G: 4  F: 3  P: 4
Score: 38 / 100  |  Classification: Moyen
Visualisation: ███████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

Comparaison (Utilisateur vs IA)
--------------------------------
Écart de score: 12 points (sur 100)
[Tableau comparatif]
```

## Avantages des modifications

### ✅ Score sur 100 (plus intuitif)
- Facilite la compréhension pour les utilisateurs
- Standard plus universel que 125
- Meilleure lisibilité des rapports

### ✅ Graphiques visuels
- Visualisation immédiate du niveau de risque
- Comparaison visuelle facile entre utilisateur et IA
- Barres textuelles compatibles avec tous les lecteurs Word

### ✅ Tableaux structurés
- Organisation claire des données
- Comparaisons côte à côte
- Format professionnel

## Tests recommandés

### 1. Test du rapport de comparaison
```bash
curl -X POST "http://localhost:8000/compare/report" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test de rapport",
    "category": "Industriel",
    "type": "Cyber & SSI",
    "user_G": 4,
    "user_F": 2,
    "user_P": 4
  }' \
  --output test_compare.docx
```

### 2. Test du rapport de questionnaire
```bash
# D'abord créer une analyse via le questionnaire
# Puis télécharger le rapport
curl "http://localhost:8000/questionnaire/{analysis_id}/report" \
  --output test_questionnaire.docx
```

### 3. Vérifications
- ✅ Le score est bien affiché sur 100
- ✅ Les graphiques s'affichent correctement
- ✅ Les tableaux sont bien formatés
- ✅ La comparaison utilisateur vs IA fonctionne
- ✅ Les barres visuelles sont proportionnelles

## Compatibilité

Les rapports Word générés sont compatibles avec :
- ✅ Microsoft Word (toutes versions récentes)
- ✅ LibreOffice Writer
- ✅ Google Docs
- ✅ Pages (macOS)
- ✅ Lecteurs Word en ligne

Les graphiques utilisent des caractères Unicode standards (█ ░) qui s'affichent correctement dans tous les environnements.

## Prochaines améliorations possibles

1. **Graphiques images** : Utiliser matplotlib pour générer de vrais graphiques PNG/SVG
2. **Couleurs** : Ajouter des couleurs aux cellules selon le niveau de risque
3. **Graphiques en camembert** : Pour la répartition G/F/P
4. **Export PDF** : Générer aussi des rapports PDF
5. **Templates personnalisés** : Permettre aux utilisateurs de choisir un template

## Notes techniques

- Les barres utilisent les caractères Unicode U+2588 (█) et U+2591 (░)
- La normalisation utilise l'arrondi mathématique standard
- Les tableaux utilisent le style "Table Grid" de Word
- Tous les scores sont des entiers (pas de décimales)
