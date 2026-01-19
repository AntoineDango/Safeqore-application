"""
Tests pour les endpoints /admin.
Administration du système SafeQore.
"""

import pytest


class TestAdminStatus:
    """Tests pour /admin/status."""

    def test_status_returns_200(self, client):
        """L'endpoint /admin/status doit retourner 200."""
        response = client.get("/admin/status")
        assert response.status_code == 200

    def test_status_response_structure(self, client):
        """La réponse doit contenir les champs attendus."""
        response = client.get("/admin/status")
        data = response.json()

        assert "is_training" in data
        assert "model_ready" in data
        assert "feedback_data" in data
        assert "scenarios_count" in data

    def test_status_is_training_boolean(self, client):
        """is_training doit être un booléen."""
        response = client.get("/admin/status")
        data = response.json()

        assert isinstance(data["is_training"], bool)
        assert isinstance(data["model_ready"], bool)


class TestAdminRetrain:
    """Tests pour /admin/retrain."""

    def test_retrain_returns_200(self, client):
        """L'endpoint /admin/retrain doit retourner 200."""
        response = client.post("/admin/retrain")
        assert response.status_code == 200

    def test_retrain_response_structure(self, client):
        """La réponse doit contenir les champs attendus."""
        response = client.post("/admin/retrain")
        data = response.json()

        assert "success" in data
        assert "message" in data


class TestAdminStats:
    """Tests pour /admin/stats."""

    def test_stats_returns_200(self, client):
        """L'endpoint /admin/stats doit retourner 200."""
        response = client.get("/admin/stats")
        assert response.status_code == 200

    def test_stats_response_is_dict(self, client):
        """La réponse doit être un dictionnaire."""
        response = client.get("/admin/stats")
        data = response.json()
        assert isinstance(data, dict)
