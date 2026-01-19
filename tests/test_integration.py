"""
Tests d'intégration SafeQore.
Ces tests vérifient le fonctionnement de bout en bout de l'application.
"""

import pytest
from unittest.mock import patch


class TestKinneyScoreIntegration:
    """Tests d'intégration pour le calcul du score Kinney."""

    @pytest.mark.parametrize("G,F,P,expected_score,expected_class", [
        (1, 1, 1, 1, "Faible"),
        (2, 2, 3, 12, "Faible"),
        (5, 1, 5, 25, "Faible"),
        (3, 3, 3, 27, "Moyen"),
        (5, 2, 5, 50, "Moyen"),
        (2, 5, 3, 30, "Moyen"),
        (4, 4, 4, 64, "Eleve"),
        (5, 5, 3, 75, "Eleve"),
        (5, 5, 5, 125, "Eleve"),
    ])
    def test_kinney_score_classification(self, client, G, F, P, expected_score, expected_class):
        """Vérifier que le score Kinney est correctement calculé et classifié."""
        mock_llm_response = {
            "G": G, "F": F, "P": P,
            "llm_classification": expected_class,
            "llm_recommendation": "Recommandation de test"
        }
        mock_ml_response = {"ml_classification": expected_class}

        with patch('app.routers.ia_router.call_llm_for_risk', return_value=mock_llm_response):
            with patch('app.routers.ia_router.predict_classification', return_value=mock_ml_response):
                response = client.post("/ia/analyze", json={
                    "description": f"Test risque G={G} F={F} P={P}",
                    "category": "Industriel",
                    "type": "Technique"
                })

                assert response.status_code == 200
                data = response.json()

                assert data["score"] == expected_score
                assert data["classification"] == expected_class


class TestUserAnalysisFlow:
    """Tests d'intégration pour le flux d'analyse utilisateur."""

    def test_user_analysis_flow_complete(self, client):
        """Test du flux complet: soumettre une analyse et vérifier son enregistrement."""
        # 1. Soumettre une analyse
        analysis = {
            "description": "Risque de test d'intégration",
            "category": "Qualité",
            "type": "Technique",
            "G": 3,
            "F": 2,
            "P": 4,
            "classification": "Moyen",
            "sector": "Technologie"
        }

        response = client.post("/user/analyze", json=analysis)
        assert response.status_code == 200

        data = response.json()
        assert data["score"] == 3 * 2 * 4  # 24

        # 2. Vérifier que l'analyse apparaît dans la liste
        list_response = client.get("/user/analyses")
        assert list_response.status_code == 200

        list_data = list_response.json()
        assert list_data["total"] >= 1

    def test_multiple_analyses_accumulate(self, client):
        """Plusieurs analyses doivent s'accumuler."""
        initial_response = client.get("/user/analyses")
        initial_count = initial_response.json()["total"]

        # Ajouter 3 analyses
        for i in range(3):
            analysis = {
                "description": f"Test analyse #{i}",
                "category": "Industriel",
                "type": "Commercial",
                "G": 2,
                "F": 2,
                "P": 2
            }
            client.post("/user/analyze", json=analysis)

        final_response = client.get("/user/analyses")
        final_count = final_response.json()["total"]

        assert final_count >= initial_count + 3


class TestAPIInfoConsistency:
    """Tests de cohérence des informations API."""

    def test_root_endpoints_are_accessible(self, client):
        """Tous les endpoints listés dans / doivent être accessibles."""
        root_response = client.get("/")
        endpoints = root_response.json()["endpoints"]

        # Vérifier /ia/analyze (POST)
        with patch('app.routers.ia_router.call_llm_for_risk', return_value={
            "G": 3, "F": 3, "P": 3,
            "llm_classification": "Moyen",
            "llm_recommendation": "Test"
        }):
            with patch('app.routers.ia_router.predict_classification', return_value={
                "ml_classification": "Moyen"
            }):
                analyze_response = client.post(endpoints["ia_analyze"]["path"], json={
                    "description": "Test",
                    "category": "Industriel",
                    "type": "Technique"
                })
                assert analyze_response.status_code == 200

        # Vérifier /constants
        constants_response = client.get(endpoints["constants"]["path"])
        assert constants_response.status_code == 200

        # Vérifier /docs
        docs_response = client.get(endpoints["docs"]["path"])
        assert docs_response.status_code == 200


class TestScenarioAnalysis:
    """Tests de scénarios d'analyse réels."""

    @pytest.mark.parametrize("scenario", [
        {
            "description": "Cyberattaque sur le système de paiement",
            "category": "Industriel",
            "type": "Cyber & SSI",
            "sector": "Technologie"
        },
        {
            "description": "Retard de livraison du projet",
            "category": "Projet/Programme",
            "type": "Commercial",
            "sector": "PME"
        },
        {
            "description": "Défaut qualité sur la chaîne de production",
            "category": "Qualité",
            "type": "Technique",
            "sector": "Industriel"
        },
        {
            "description": "Perte financière due à la fluctuation des marchés",
            "category": "Projet/Programme",
            "type": "Financier",
            "sector": "Startup"
        }
    ])
    def test_scenario_analysis(self, client, scenario):
        """Différents scénarios de risques doivent être analysables."""
        mock_llm = {
            "G": 3, "F": 3, "P": 3,
            "llm_classification": "Moyen",
            "llm_recommendation": "Actions à prendre..."
        }
        mock_ml = {"ml_classification": "Moyen"}

        with patch('app.routers.ia_router.call_llm_for_risk', return_value=mock_llm):
            with patch('app.routers.ia_router.predict_classification', return_value=mock_ml):
                response = client.post("/ia/analyze", json=scenario)

                assert response.status_code == 200
                data = response.json()

                # Vérifier la structure complète de la réponse
                assert all(key in data for key in ["G", "F", "P", "score", "classification"])
                assert 1 <= data["G"] <= 5
                assert 1 <= data["F"] <= 5
                assert 1 <= data["P"] <= 5
                assert 1 <= data["score"] <= 125
                assert data["classification"] in ["Faible", "Moyen", "Eleve"]


class TestClassificationReconciliation:
    """Tests de réconciliation entre LLM, ML et score Kinney."""

    def test_kinney_score_takes_priority(self, client):
        """Le score Kinney doit avoir priorité en cas de conflit."""
        # Score = 1*1*1 = 1 → Faible (mais LLM dit Eleve)
        mock_llm = {
            "G": 1, "F": 1, "P": 1,
            "llm_classification": "Eleve",
            "llm_recommendation": "Test"
        }
        mock_ml = {"ml_classification": "Moyen"}

        with patch('app.routers.ia_router.call_llm_for_risk', return_value=mock_llm):
            with patch('app.routers.ia_router.predict_classification', return_value=mock_ml):
                response = client.post("/ia/analyze", json={
                    "description": "Test de réconciliation",
                    "category": "Industriel",
                    "type": "Technique"
                })

                data = response.json()
                # Le score = 1, donc classification devrait être "Faible"
                assert data["score"] == 1
                assert data["classification"] == "Faible"
