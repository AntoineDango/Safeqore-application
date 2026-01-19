"""
Configuration et fixtures pour les tests SafeQore.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import sys
import os

# Ajouter le répertoire racine au path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app


@pytest.fixture
def client():
    """Client de test FastAPI."""
    return TestClient(app)


@pytest.fixture
def valid_ia_request():
    """Exemple de requête d'analyse IA valide."""
    return {
        "description": "Risque de cyberattaque sur le système de paiement",
        "category": "Industriel",
        "type": "Cyber & SSI",
        "sector": "Technologie"
    }


@pytest.fixture
def valid_user_request():
    """Exemple de requête d'analyse utilisateur valide."""
    return {
        "description": "Risque de panne serveur critique",
        "category": "Industriel",
        "type": "Technique",
        "G": 4,
        "F": 3,
        "P": 3,
        "classification": "Modéré",
        "sector": "Technologie",
        "mitigation": "Mise en place d'un système de redondance"
    }


@pytest.fixture
def valid_compare_request():
    """Exemple de requête de comparaison valide."""
    return {
        "description": "Risque de cyberattaque sur le système de paiement",
        "category": "Industriel",
        "type": "Cyber & SSI",
        "sector": "Technologie",
        "user_G": 4,
        "user_F": 3,
        "user_P": 3,
        "user_classification": "Moyen"
    }


@pytest.fixture
def mock_llm_response():
    """Réponse simulée du LLM avec causes et recommandations détaillées."""
    return {
        "G": 4,
        "F": 3,
        "P": 3,
        "llm_classification": "Moyen",
        "causes": [
            "Cause 1: Vulnérabilités non corrigées dans le système de paiement",
            "Cause 2: Manque de formation du personnel à la sécurité",
            "Cause 3: Absence de surveillance proactive des menaces"
        ],
        "recommendations": [
            "Mettre en place un programme de patch management régulier",
            "Former le personnel aux bonnes pratiques de cybersécurité",
            "Déployer un système de détection d'intrusion (IDS/IPS)",
            "Effectuer des tests de pénétration trimestriels"
        ],
        "justification": "Gravité 4 car impact financier et réputationnel majeur, Fréquence 3 car attaques régulières dans le secteur, Probabilité 3 car mesures de sécurité partielles."
    }


@pytest.fixture
def mock_ml_response():
    """Réponse simulée du modèle ML."""
    return {
        "ml_classification": "Moyen"
    }


@pytest.fixture
def mock_llm_service(mock_llm_response):
    """Mock du service LLM pour l'analyse IA."""
    with patch('app.routers.ia_router.call_llm_for_risk') as mock:
        mock.return_value = mock_llm_response
        yield mock


@pytest.fixture
def mock_ml_service(mock_ml_response):
    """Mock du service ML pour l'analyse IA."""
    with patch('app.routers.ia_router.predict_classification') as mock:
        mock.return_value = mock_ml_response
        yield mock


@pytest.fixture
def mock_compare_llm(mock_llm_response):
    """Mock du service LLM pour la comparaison."""
    with patch('app.routers.compare_router.call_llm_for_risk') as mock:
        mock.return_value = mock_llm_response
        yield mock


# Constantes pour les tests
VALID_CATEGORIES = ["Projet/Programme", "Industriel", "Qualité"]
VALID_TYPES = ["Commercial", "Financier", "Technique", "Cyber & SSI"]
VALID_SECTORS = [
    "Mobilité et Transport", "Agriculture", "Technologie",
    "Innovation", "Startup", "TPE", "PME", "ETI"
]
VALID_CLASSIFICATIONS = ["Faible", "Modéré", "Élevé"]
