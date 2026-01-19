"""
Tests pour l'endpoint /ia/analyze.
Analyse des risques par l'IA (LLM + ML + Kinney).
"""

import pytest
from unittest.mock import patch


class TestIAAnalyzeValidation:
    """Tests de validation des entrées pour /ia/analyze."""

    def test_missing_description_returns_422(self, client):
        """Une requête sans description doit échouer."""
        response = client.post("/ia/analyze", json={
            "category": "Industriel",
            "type": "Technique"
        })
        assert response.status_code == 422

    def test_missing_category_returns_422(self, client):
        """Une requête sans catégorie doit échouer."""
        response = client.post("/ia/analyze", json={
            "description": "Test de risque",
            "type": "Technique"
        })
        assert response.status_code == 422

    def test_missing_type_returns_422(self, client):
        """Une requête sans type doit échouer."""
        response = client.post("/ia/analyze", json={
            "description": "Test de risque",
            "category": "Industriel"
        })
        assert response.status_code == 422

    def test_sector_is_optional(self, client, mock_llm_service, mock_ml_service):
        """Le secteur doit être optionnel."""
        response = client.post("/ia/analyze", json={
            "description": "Test de risque",
            "category": "Industriel",
            "type": "Technique"
        })
        assert response.status_code == 200

    def test_invalid_category_returns_400(self, client, mock_llm_service, mock_ml_service):
        """Une catégorie invalide doit retourner 400."""
        response = client.post("/ia/analyze", json={
            "description": "Test de risque",
            "category": "CatégorieInvalide",
            "type": "Technique"
        })
        assert response.status_code == 400

    def test_invalid_type_returns_400(self, client, mock_llm_service, mock_ml_service):
        """Un type invalide doit retourner 400."""
        response = client.post("/ia/analyze", json={
            "description": "Test de risque",
            "category": "Industriel",
            "type": "TypeInvalide"
        })
        assert response.status_code == 400


class TestIAAnalyzeWithMocks:
    """Tests de l'endpoint /ia/analyze avec mocks."""

    def test_successful_analysis(self, client, valid_ia_request, mock_llm_service, mock_ml_service):
        """Une analyse réussie doit retourner les facteurs G, F, P, le score, les causes et recommandations."""
        response = client.post("/ia/analyze", json=valid_ia_request)

        assert response.status_code == 200
        data = response.json()

        # Vérifier la structure de la réponse
        assert "G" in data
        assert "F" in data
        assert "P" in data
        assert "score" in data
        assert "classification" in data
        assert "ml_classification" in data
        assert "causes" in data
        assert "recommendations" in data
        assert "justification" in data

        # Vérifier que causes et recommendations sont des listes
        assert isinstance(data["causes"], list)
        assert isinstance(data["recommendations"], list)
        assert len(data["causes"]) >= 1
        assert len(data["recommendations"]) >= 1

    def test_response_has_valid_gfp_values(self, client, valid_ia_request, mock_llm_service, mock_ml_service):
        """Les valeurs G, F, P doivent être entre 1 et 5."""
        response = client.post("/ia/analyze", json=valid_ia_request)
        data = response.json()

        assert 1 <= data["G"] <= 5
        assert 1 <= data["F"] <= 5
        assert 1 <= data["P"] <= 5

    def test_score_is_correctly_calculated(self, client, valid_ia_request, mock_llm_service, mock_ml_service):
        """Le score Kinney doit être G * F * P."""
        response = client.post("/ia/analyze", json=valid_ia_request)
        data = response.json()

        expected_score = data["G"] * data["F"] * data["P"]
        assert data["score"] == expected_score

    def test_classification_is_valid(self, client, valid_ia_request, mock_llm_service, mock_ml_service):
        """La classification doit être Faible, Moyen ou Eleve."""
        response = client.post("/ia/analyze", json=valid_ia_request)
        data = response.json()

        valid_classifications = ["Faible", "Moyen", "Eleve"]
        assert data["classification"] in valid_classifications

    def test_classification_matches_score_range(self, client, valid_ia_request):
        """La classification doit correspondre à la plage du score Kinney."""
        test_cases = [
            (1, 1, 1, 1, "Faible"),
            (2, 2, 2, 8, "Faible"),
            (3, 3, 3, 27, "Moyen"),
            (4, 3, 3, 36, "Moyen"),
            (4, 4, 4, 64, "Eleve"),
            (5, 5, 5, 125, "Eleve"),
        ]

        for G, F, P, expected_score, expected_class in test_cases:
            mock_llm_response = {
                "G": G, "F": F, "P": P,
                "llm_classification": expected_class,
                "causes": ["Cause test 1", "Cause test 2"],
                "recommendations": ["Recommandation test 1", "Recommandation test 2"],
                "justification": "Justification test"
            }
            mock_ml_response = {"ml_classification": expected_class}

            with patch('app.routers.ia_router.call_llm_for_risk', return_value=mock_llm_response):
                with patch('app.routers.ia_router.predict_classification', return_value=mock_ml_response):
                    response = client.post("/ia/analyze", json=valid_ia_request)
                    data = response.json()

                    assert data["score"] == expected_score
                    assert data["classification"] == expected_class


class TestIAAnalyzeLLMFailure:
    """Tests de gestion des erreurs LLM."""

    def test_llm_unavailable_returns_503(self, client, valid_ia_request):
        """Si le LLM est indisponible, retourner 503."""
        with patch('app.routers.ia_router.call_llm_for_risk', return_value=None):
            response = client.post("/ia/analyze", json=valid_ia_request)

            assert response.status_code == 503
            data = response.json()
            assert "indisponible" in data["detail"].lower()

    def test_llm_malformed_response_returns_502(self, client, valid_ia_request):
        """Si le LLM retourne une réponse malformée, retourner 502."""
        with patch('app.routers.ia_router.call_llm_for_risk', return_value={"invalid": "data"}):
            response = client.post("/ia/analyze", json=valid_ia_request)

            assert response.status_code == 502
            data = response.json()
            assert "malformée" in data["detail"].lower()


class TestIAAnalyzeAllCategories:
    """Tests pour toutes les catégories et types valides."""

    @pytest.mark.parametrize("category", ["Projet/Programme", "Industriel", "Qualité"])
    def test_valid_categories(self, client, category, mock_llm_service, mock_ml_service):
        """Toutes les catégories valides doivent être acceptées."""
        response = client.post("/ia/analyze", json={
            "description": "Test de risque",
            "category": category,
            "type": "Technique"
        })
        assert response.status_code == 200

    @pytest.mark.parametrize("risk_type", ["Commercial", "Financier", "Technique", "Cyber & SSI"])
    def test_valid_types(self, client, risk_type, mock_llm_service, mock_ml_service):
        """Tous les types valides doivent être acceptés."""
        response = client.post("/ia/analyze", json={
            "description": "Test de risque",
            "category": "Industriel",
            "type": risk_type
        })
        assert response.status_code == 200

    @pytest.mark.parametrize("sector", [
        "Mobilité et Transport", "Agriculture", "Technologie",
        "Innovation", "Startup", "TPE", "PME", "ETI"
    ])
    def test_valid_sectors(self, client, sector, mock_llm_service, mock_ml_service):
        """Tous les secteurs valides doivent être acceptés."""
        response = client.post("/ia/analyze", json={
            "description": "Test de risque",
            "category": "Industriel",
            "type": "Technique",
            "sector": sector
        })
        assert response.status_code == 200
