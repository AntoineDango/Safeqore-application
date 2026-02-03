# 🚀 Installation et Test des Modifications

## 📋 Prérequis

Avant de tester les modifications, assurez-vous que :
- Python 3.8+ est installé
- Les dépendances sont installées
- Le serveur peut démarrer

## 🔧 Installation

### 1. Installer les dépendances

```bash
cd /home/dango/Documents/projects-safeqore/safeqore_IA

# Activer l'environnement virtuel (si pas déjà activé)
source venv/bin/activate

# Installer/Mettre à jour les dépendances
pip install -r requirements.txt
```

### 2. Vérifier l'installation

```bash
# Vérifier que les modules s'importent correctement
python -c "from app.routers import compare_router, questionnaire_router; print('✅ OK')"

# Vérifier python-docx
python -c "from docx import Document; print('✅ python-docx OK')"
```

## 🧪 Tests

### Test 1 : Démarrer le serveur

```bash
# Démarrer le serveur
uvicorn app.main:app --reload --port 8000

# Dans un autre terminal, vérifier que le serveur répond
curl http://localhost:8000/health
```

**Résultat attendu :**
```json
{"status": "healthy"}
```

### Test 2 : Générer un rapport de comparaison

```bash
curl -X POST "http://localhost:8000/compare/report" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test de rapport avec score sur 100",
    "category": "Industriel",
    "type": "Cyber & SSI",
    "user_G": 4,
    "user_F": 2,
    "user_P": 4
  }' \
  --output test_compare.docx
```

**Vérifications :**
1. Le fichier `test_compare.docx` est créé
2. Ouvrir le fichier dans Word/LibreOffice
3. Vérifier que le score est affiché sur 100 (pas 125)
4. Vérifier que les graphiques avec barres sont visibles

**Calcul attendu :**
- G=4, F=2, P=4
- Score brut = 4 × 2 × 4 = 32/125
- Score normalisé = 32/125 × 100 = 26/100 ✅

### Test 3 : Générer un rapport de questionnaire

```bash
# Étape 1 : Créer une analyse
curl -X POST "http://localhost:8000/questionnaire/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test questionnaire",
    "category": "Industriel",
    "type": "Mécanique",
    "method": "Questionnaire",
    "answers": {
      "G": {"Q1": 4, "Q2": 3, "Q3": 5},
      "F": {"Q1": 2, "Q2": 2, "Q3": 3},
      "P": {"Q1": 4, "Q2": 4, "Q3": 3}
    }
  }' | jq -r '.id'

# Étape 2 : Télécharger le rapport (remplacer {ID} par l'ID retourné)
curl "http://localhost:8000/questionnaire/{ID}/report" \
  --output test_questionnaire.docx
```

**Vérifications :**
1. Le fichier `test_questionnaire.docx` est créé
2. Le score est sur 100
3. Les graphiques des facteurs G/F/P sont présents
4. Le tableau comparatif utilisateur vs IA est visible (si IA activée)

### Test 4 : Script de test automatisé

```bash
# Exécuter le script de test
python test_rapport_word.py
```

**Résultat attendu :**
```
🔬 ===========================================================
   TEST DES RAPPORTS WORD - Score sur 100 + Graphiques
===========================================================

✅ Serveur accessible à http://localhost:8000

============================================================
TEST 1: Rapport de comparaison (Humain vs IA)
============================================================

📊 Données de test:
   G: 4 | F: 2 | P: 4
   Score brut: 32/125
   Score normalisé attendu: 26/100

✅ Rapport généré avec succès!
   Fichier: /path/to/test_compare_report.docx
   Taille: XXXX octets

============================================================
TEST 2: Rapport de questionnaire
============================================================

✅ Analyse créée: QR_XXXXXXXXXX_X
   G: 4 | F: 2 | P: 4
   Score: 26/100
   Classification: Moyen

✅ Rapport généré avec succès!
   Fichier: /path/to/test_questionnaire_report.docx

============================================================
RÉSUMÉ DES TESTS
============================================================
✅ PASS - Rapport de comparaison
✅ PASS - Rapport de questionnaire

📊 Résultat: 2/2 tests réussis

🎉 Tous les tests sont passés!
```

## ✅ Checklist de validation

### Code
- [x] Syntaxe Python correcte (vérifié avec `python -m py_compile`)
- [x] Imports corrects
- [x] Pas d'erreurs de typage

### Fonctionnalités
- [ ] Score normalisé sur 100 dans `/compare/report`
- [ ] Score normalisé sur 100 dans `/questionnaire/{id}/report`
- [ ] Graphiques visuels avec barres
- [ ] Tableaux des facteurs G/F/P
- [ ] Comparaison utilisateur vs IA

### Rapports Word
- [ ] Le fichier .docx se génère
- [ ] Le fichier s'ouvre dans Word/LibreOffice
- [ ] Le score est affiché sur 100
- [ ] Les graphiques sont visibles
- [ ] Les tableaux sont bien formatés
- [ ] Les caractères Unicode (█ ░) s'affichent

## 🐛 Dépannage

### Erreur : ModuleNotFoundError: No module named 'fastapi'

**Solution :**
```bash
pip install -r requirements.txt
```

### Erreur : ModuleNotFoundError: No module named 'docx'

**Solution :**
```bash
pip install python-docx
```

### Le serveur ne démarre pas

**Solution :**
```bash
# Vérifier les logs
uvicorn app.main:app --reload --log-level debug

# Vérifier que le port 8000 est libre
lsof -i :8000
```

### Les graphiques ne s'affichent pas dans Word

**Solution :**
1. Utiliser une police compatible Unicode (Arial, Calibri)
2. Mettre à jour Word/LibreOffice
3. Vérifier que l'encodage est UTF-8

## 📊 Exemples de résultats attendus

### Exemple 1 : Score faible
- G=2, F=2, P=2
- Score brut = 8/125
- Score normalisé = **6/100** ✅
- Classification = Faible

### Exemple 2 : Score moyen
- G=4, F=2, P=4
- Score brut = 32/125
- Score normalisé = **26/100** ✅
- Classification = Moyen

### Exemple 3 : Score élevé
- G=5, F=4, P=5
- Score brut = 100/125
- Score normalisé = **80/100** ✅
- Classification = Élevé

### Exemple 4 : Score maximum
- G=5, F=5, P=5
- Score brut = 125/125
- Score normalisé = **100/100** ✅
- Classification = Élevé

## 🎯 Validation finale

Une fois tous les tests passés :

1. ✅ Les rapports se génèrent sans erreur
2. ✅ Le score est sur 100 (pas 125)
3. ✅ Les graphiques sont visibles
4. ✅ Les tableaux sont bien formatés
5. ✅ La comparaison utilisateur vs IA fonctionne

**Statut :** Prêt pour la production ✅

## 📚 Documentation

- **RAPPORT_WORD_AMELIORATIONS.md** - Documentation technique détaillée
- **GUIDE_RAPPORTS_WORD.md** - Guide d'utilisation
- **RESUME_MODIFICATIONS.md** - Résumé des modifications
- **INSTALLATION_ET_TEST.md** - Ce fichier

## 🚀 Déploiement

Une fois validé en local :

```bash
# Commiter les modifications
git add app/routers/compare_router.py app/routers/questionnaire_router.py
git commit -m "feat: Normaliser score sur 100 et ajouter graphiques dans rapports Word"

# Pousser vers le dépôt
git push origin main

# Redémarrer le serveur en production
# (selon votre configuration de déploiement)
```

---

**Date :** 2026-01-25  
**Version :** 2.0.0  
**Statut :** ✅ Prêt pour les tests
