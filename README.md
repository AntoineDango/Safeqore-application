# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Safequore-backend is a FastAPI-based hybrid risk analysis system that combines LLM-powered risk assessment with machine learning classification using the Kinney risk methodology.

## Development Commands

**Activate virtual environment:**
```bash
source venv/bin/activate
```

**Install dependencies:**
```bash
pip install -r requirements.txt
```

**Run development server:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 4000
```

**Run with Docker:**
```bash
docker build -t safequore-backend .
docker run -p 4000:4000 --env-file .env safequore-backend
```

## Architecture

### Hybrid Risk Assessment Flow

The system implements a three-stage risk analysis pipeline in [app/routers/ai_router.py](app/routers/ai_router.py):

1. **LLM Analysis** ([app/services/llm_service.py](app/services/llm_service.py))
   - Uses Groq's LLaMA model (default: llama-3.3-70b-versatile)
   - Analyzes risk description and returns Kinney parameters (G, F, P) + classification
   - Includes retry logic with exponential backoff
   - Extracts JSON from LLM response (handles surrounding text)

2. **ML Validation** ([app/services/ml_service.py](app/services/ml_service.py))
   - Uses pre-trained sklearn model (`risk_classifier.pkl`)
   - Validates classification based on G, F, P, category, and type
   - Gracefully handles unknown categories/types through safe encoding

3. **Reconciliation Logic** ([app/utils/normalize.py](app/utils/normalize.py))
   - Computes Kinney score: `score = G × F × P`
   - Deterministic classification from score:
     - ≤25: "Faible"
     - ≤50: "Moyen"
     - >50: "Eleve"
   - When ML and score-based classifications conflict, prefers score-based (deterministic)

### Kinney Methodology

The Kinney method evaluates risk through three dimensions:
- **G (Gravity)**: Severity of potential consequences
- **F (Frequency)**: How often exposure occurs
- **P (Probability)**: Likelihood of incident occurring

Final risk score = G × F × P

### Project Structure

```
app/
├── main.py              # FastAPI app initialization, router registration
├── routers/
│   └── ai_router.py     # /hybrid-analyze endpoint, orchestrates LLM+ML
├── services/
│   ├── llm_service.py   # Groq LLM integration, JSON parsing
│   └── ml_service.py    # ML model loading, prediction
├── models/
│   └── schemas.py       # Pydantic models (currently minimal)
└── utils/
    └── normalize.py     # Kinney scoring, classification logic

*.pkl files (root):      # Pre-trained ML models and encoders
```

## Environment Configuration

Required environment variables in `.env`:

- `GROQ_API_KEY`: Groq API key for LLM access
- `GROQ_MODEL`: LLM model name (default: llama-3.3-70b-versatile)
- `GROQ_TEMPERATURE`: LLM temperature (default: 0.15)
- `ML_MODEL_PATH`: Path to risk classifier model (default: risk_classifier.pkl)
- `ENCODERS_PATH`: Path to category/type encoders (default: encoders.pkl)
- `CLASS_ENCODER_PATH`: Path to classification encoder (default: classification_encoder.pkl)
- `PORT`: Server port (default: 4000)

## Key Design Decisions

**LLM Response Parsing**: The LLM service extracts JSON from responses by finding the first `{` and last `}`, allowing the model to include explanatory text before/after the JSON payload.

**Graceful Degradation**: Both LLM and ML services handle failures gracefully:
- LLM retries with exponential backoff before returning None
- ML service defaults to 0 for unknown categories/types rather than failing

**Classification Priority**: When ML and deterministic classifications conflict, the system prefers the deterministic score-based classification to ensure consistency with the Kinney methodology.

## Tests

Le projet inclut une suite complète de tests pour vérifier le bon fonctionnement de l'application.

### Installation des dépendances de test

```bash
pip install -r requirements-test.txt
```

### Exécution des tests

```bash
# Exécuter tous les tests
python run_tests.py

# Tests rapides uniquement
python run_tests.py --quick

# Tests de santé uniquement
python run_tests.py --health

# Avec rapport de couverture
python run_tests.py --coverage

# Mode verbeux
python run_tests.py --verbose

# Afficher les informations sur les tests
python run_tests.py --info
```

### Utilisation directe de pytest

```bash
# Tous les tests
pytest

# Tests spécifiques
pytest tests/test_health.py          # Endpoints de base
pytest tests/test_hybrid_analyze.py  # Analyse de risques
pytest tests/test_enrichment.py      # Enrichissement
pytest tests/test_integration.py     # Tests d'intégration

# Avec couverture
pytest --cov=app --cov-report=term-missing
```

### Structure des tests

```
tests/
├── conftest.py              # Fixtures et configuration
├── test_health.py           # Tests endpoints /, /health, /docs
├── test_hybrid_analyze.py   # Tests /hybrid-analyze
├── test_enrichment.py       # Tests /enrichment/*
└── test_integration.py      # Tests d'intégration bout-en-bout
```

### Tests disponibles

| Fichier | Description |
|---------|-------------|
| `test_health.py` | Endpoints de base (/, /health), documentation Swagger |
| `test_hybrid_analyze.py` | Analyse hybride, validation entrées, calcul Kinney, erreurs LLM |
| `test_enrichment.py` | Constantes, feedbacks, stats, statut, ré-entraînement |
| `test_integration.py` | Flux complets, scénarios réels, réconciliation LLM/ML/Kinney |

## Important Notes

- The ML models (`.pkl` files) are NOT version-controlled dependencies but runtime artifacts
- LLM responses are in French ("Faible", "Moyen", "Eleve")
- The system expects category and type to match training data for optimal ML performance
