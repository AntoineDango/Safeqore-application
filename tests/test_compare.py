"""
Tests pour l'endpoint /compare.
Comparaison entre l'analyse humaine et l'analyse IA.
"""

import pytest
from unittest.mock import patch


class TestCompareValidation:
    """Tests de validation des entrées pour /compare."""

    def test_missing_user_gfp_returns_422(self, client):
        """Une requête sans user_G, user_F ou user_P doit échouer."""
        response = client.post("/compare", json={
            "description": "Test de risque",
            "category": "Industriel",
            "type": "Technique"
        })
        assert response.status_code == 422

    def test_user_g_out_of_range_returns_422(self, client):
        """user_G hors plage [1-5] doit échouer."""
        response = client.post("/compare", json={
            "description": "Test",
            "category": "Industriel",
            "type": "Technique",
            "user_G": 10, "user_F": 3, "user_P": 3
        })
        assert response.status_code == 422

    def test_invalid_category_returns_400(self, client, mock_compare_llm):
        """Une catégorie invalide doit retourner 400."""
        response = client.post("/compare", json={
            "description": "Test",
            "category": "CatégorieInvalide",
            "type": "Technique",
            "user_G": 3, "user_F": 3, "user_P": 3
        })
        assert response.status_code == 400


class TestCompareSuccess:
    """Tests de succès pour /compare."""

    def test_successful_comparison(self, client, valid_compare_request, mock_compare_llm):
        """Une comparaison valide doit retourner 200."""
        response = client.post("/compare", json=valid_compare_request)
        assert response.status_code == 200

    def test_response_structure(self, client, valid_compare_request, mock_compare_llm):
        """La réponse doit contenir les analyses humaine et IA avec causes et recommandations."""
        response = client.post("/compare", json=valid_compare_request)
        data = response.json()

        # Vérifier la structure
        assert "human_analysis" in data
        assert "ia_analysis" in data
        assert "comparison" in data

        # Vérifier l'analyse humaine
        human = data["human_analysis"]
        assert "G" in human
        assert "F" in human
        assert "P" in human
        assert "score" in human
        assert "classification" in human

        # Vérifier l'analyse IA avec causes et recommandations détaillées
        ia = data["ia_analysis"]
        assert "G" in ia
        assert "F" in ia
        assert "P" in ia
        assert "score" in ia
        assert "classification" in ia
        assert "causes" in ia
        assert "recommendations" in ia
        assert "justification" in ia

        # Vérifier que causes et recommendations sont des listes
        assert isinstance(ia["causes"], list)
        assert isinstance(ia["recommendations"], list)

    def test_comparison_contains_metrics(self, client, valid_compare_request, mock_compare_llm):
        """La comparaison doit contenir les métriques."""
        response = client.post("/compare", json=valid_compare_request)
        data = response.json()

        comparison = data["comparison"]
        assert "G" in comparison
        assert "F" in comparison
        assert "P" in comparison
        assert "score" in comparison
        assert "agreement_level" in comparison
        assert "classifications_match" in comparison

    def test_human_scores_match_input(self, client, valid_compare_request, mock_compare_llm):
        """Les scores humains doivent correspondre à l'entrée."""
        response = client.post("/compare", json=valid_compare_request)
        data = response.json()

        human = data["human_analysis"]
        assert human["G"] == valid_compare_request["user_G"]
        assert human["F"] == valid_compare_request["user_F"]
        assert human["P"] == valid_compare_request["user_P"]


class TestCompareAgreementLevels:
    """Tests pour les niveaux d'accord."""

    def test_strong_agreement(self, client):
        """Accord fort quand classifications et scores sont proches."""
        mock_llm = {
            "G": 3, "F": 3, "P": 3,
            "llm_classification": "Moyen",
            "causes": ["Cause 1", "Cause 2"],
            "recommendations": ["Reco 1", "Reco 2"],
            "justification": "Justification test"
        }

        with patch('app.routers.compare_router.call_llm_for_risk', return_value=mock_llm):
            response = client.post("/compare", json={
                "description": "Test",
                "category": "Industriel",
                "type": "Technique",
                "user_G": 3, "user_F": 3, "user_P": 3
            })
            data = response.json()

            assert data["comparison"]["agreement_level"] == "fort"
            assert data["comparison"]["classifications_match"] is True

    def test_weak_agreement_different_classifications(self, client):
        """Accord faible quand les classifications diffèrent significativement."""
        mock_llm = {
            "G": 5, "F": 5, "P": 5,
            "llm_classification": "Eleve",
            "causes": ["Cause grave 1", "Cause grave 2"],
            "recommendations": ["Reco urgente 1", "Reco urgente 2"],
            "justification": "Situation critique nécessitant une action immédiate"
        }

        with patch('app.routers.compare_router.call_llm_for_risk', return_value=mock_llm):
            response = client.post("/compare", json={
                "description": "Test",
                "category": "Industriel",
                "type": "Technique",
                "user_G": 1, "user_F": 1, "user_P": 1  # Score = 1 → Faible
            })
            data = response.json()

            assert data["comparison"]["agreement_level"] == "faible"
            assert data["comparison"]["classifications_match"] is False


class TestCompareLLMFailure:
    """Tests de gestion des erreurs LLM pour /compare."""

    def test_llm_unavailable_returns_503(self, client, valid_compare_request):
        """Si le LLM est indisponible, retourner 503."""
        with patch('app.routers.compare_router.call_llm_for_risk', return_value=None):
            response = client.post("/compare", json=valid_compare_request)

            assert response.status_code == 503

    def test_llm_malformed_response_returns_502(self, client, valid_compare_request):
        """Si le LLM retourne une réponse malformée, retourner 502."""
        with patch('app.routers.compare_router.call_llm_for_risk', return_value={"invalid": "data"}):
            response = client.post("/compare", json=valid_compare_request)

            assert response.status_code == 502
