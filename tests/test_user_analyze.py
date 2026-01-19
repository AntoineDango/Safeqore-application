"""
Tests pour les endpoints /user/analyze et /user/analyses.
Analyse des risques par l'utilisateur.
"""

import pytest


class TestUserAnalyzeValidation:
    """Tests de validation des entrées pour /user/analyze."""

    def test_missing_description_returns_422(self, client):
        """Une requête sans description doit échouer."""
        response = client.post("/user/analyze", json={
            "category": "Industriel",
            "type": "Technique",
            "G": 3, "F": 3, "P": 3
        })
        assert response.status_code == 422

    def test_missing_gfp_returns_422(self, client):
        """Une requête sans G, F ou P doit échouer."""
        response = client.post("/user/analyze", json={
            "description": "Test de risque",
            "category": "Industriel",
            "type": "Technique"
        })
        assert response.status_code == 422

    def test_g_out_of_range_returns_422(self, client):
        """G hors plage [1-5] doit échouer."""
        response = client.post("/user/analyze", json={
            "description": "Test",
            "category": "Industriel",
            "type": "Technique",
            "G": 10, "F": 3, "P": 3
        })
        assert response.status_code == 422

    def test_f_out_of_range_returns_422(self, client):
        """F hors plage [1-5] doit échouer."""
        response = client.post("/user/analyze", json={
            "description": "Test",
            "category": "Industriel",
            "type": "Technique",
            "G": 3, "F": 0, "P": 3
        })
        assert response.status_code == 422

    def test_p_out_of_range_returns_422(self, client):
        """P hors plage [1-5] doit échouer."""
        response = client.post("/user/analyze", json={
            "description": "Test",
            "category": "Industriel",
            "type": "Technique",
            "G": 3, "F": 3, "P": 6
        })
        assert response.status_code == 422

    def test_invalid_category_returns_400(self, client):
        """Une catégorie invalide doit retourner 400."""
        response = client.post("/user/analyze", json={
            "description": "Test",
            "category": "CatégorieInvalide",
            "type": "Technique",
            "G": 3, "F": 3, "P": 3
        })
        assert response.status_code == 400

    def test_invalid_type_returns_400(self, client):
        """Un type invalide doit retourner 400."""
        response = client.post("/user/analyze", json={
            "description": "Test",
            "category": "Industriel",
            "type": "TypeInvalide",
            "G": 3, "F": 3, "P": 3
        })
        assert response.status_code == 400

    def test_invalid_classification_returns_400(self, client):
        """Une classification invalide doit retourner 400."""
        response = client.post("/user/analyze", json={
            "description": "Test",
            "category": "Industriel",
            "type": "Technique",
            "G": 3, "F": 3, "P": 3,
            "classification": "ClassInvalide"
        })
        assert response.status_code == 400


class TestUserAnalyzeSuccess:
    """Tests de succès pour /user/analyze."""

    def test_successful_analysis(self, client, valid_user_request):
        """Une analyse utilisateur valide doit retourner 200."""
        response = client.post("/user/analyze", json=valid_user_request)
        assert response.status_code == 200

    def test_response_structure(self, client, valid_user_request):
        """La réponse doit contenir tous les champs attendus."""
        response = client.post("/user/analyze", json=valid_user_request)
        data = response.json()

        assert "id" in data
        assert "timestamp" in data
        assert "G" in data
        assert "F" in data
        assert "P" in data
        assert "score" in data
        assert "computed_classification" in data

    def test_score_calculation(self, client, valid_user_request):
        """Le score doit être G × F × P."""
        response = client.post("/user/analyze", json=valid_user_request)
        data = response.json()

        expected_score = valid_user_request["G"] * valid_user_request["F"] * valid_user_request["P"]
        assert data["score"] == expected_score

    def test_classification_without_user_input(self, client):
        """Sans classification utilisateur, la classification calculée est utilisée."""
        response = client.post("/user/analyze", json={
            "description": "Test de risque",
            "category": "Industriel",
            "type": "Technique",
            "G": 3, "F": 3, "P": 3
        })
        data = response.json()

        # Score = 27 → Moyen
        assert data["computed_classification"] == "Moyen"

    @pytest.mark.parametrize("classification", ["Faible", "Moyen", "Eleve"])
    def test_valid_classifications_accepted(self, client, classification):
        """Toutes les classifications valides doivent être acceptées."""
        response = client.post("/user/analyze", json={
            "description": "Test",
            "category": "Industriel",
            "type": "Technique",
            "G": 3, "F": 3, "P": 3,
            "classification": classification
        })
        assert response.status_code == 200


class TestUserAnalysesList:
    """Tests pour /user/analyses."""

    def test_list_returns_200(self, client):
        """L'endpoint /user/analyses doit retourner 200."""
        response = client.get("/user/analyses")
        assert response.status_code == 200

    def test_list_response_structure(self, client):
        """La réponse doit contenir les champs de pagination."""
        response = client.get("/user/analyses")
        data = response.json()

        assert "total" in data
        assert "limit" in data
        assert "offset" in data
        assert "analyses" in data

    def test_list_default_pagination(self, client):
        """Les valeurs par défaut de pagination doivent être correctes."""
        response = client.get("/user/analyses")
        data = response.json()

        assert data["limit"] == 50
        assert data["offset"] == 0

    def test_list_custom_limit(self, client):
        """Le paramètre limit doit être respecté."""
        response = client.get("/user/analyses?limit=10")
        data = response.json()

        assert data["limit"] == 10

    def test_list_custom_offset(self, client):
        """Le paramètre offset doit être respecté."""
        response = client.get("/user/analyses?offset=5")
        data = response.json()

        assert data["offset"] == 5


class TestKinneyScoreClassification:
    """Tests pour la classification Kinney."""

    @pytest.mark.parametrize("G,F,P,expected_class", [
        (1, 1, 1, "Faible"),    # Score = 1
        (5, 5, 1, "Faible"),    # Score = 25
        (3, 3, 3, "Moyen"),     # Score = 27
        (5, 5, 2, "Moyen"),     # Score = 50
        (4, 4, 4, "Eleve"),     # Score = 64
        (5, 5, 5, "Eleve"),     # Score = 125
    ])
    def test_kinney_classification(self, client, G, F, P, expected_class):
        """La classification doit correspondre au score Kinney."""
        response = client.post("/user/analyze", json={
            "description": f"Test G={G} F={F} P={P}",
            "category": "Industriel",
            "type": "Technique",
            "G": G, "F": F, "P": P
        })
        data = response.json()

        assert data["computed_classification"] == expected_class
