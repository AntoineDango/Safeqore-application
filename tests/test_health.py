"""
Tests pour les endpoints de base (santé, info API, constantes).
"""

import pytest


class TestRootEndpoint:
    """Tests pour l'endpoint racine /"""

    def test_root_returns_200(self, client):
        """L'endpoint / doit retourner un statut 200."""
        response = client.get("/")
        assert response.status_code == 200

    def test_root_returns_api_info(self, client):
        """L'endpoint / doit retourner les informations de l'API."""
        response = client.get("/")
        data = response.json()

        assert "name" in data
        assert "version" in data
        assert "description" in data
        assert "endpoints" in data

    def test_root_contains_correct_name(self, client):
        """L'endpoint / doit retourner le bon nom d'API."""
        response = client.get("/")
        data = response.json()
        assert data["name"] == "SafeQore API"

    def test_root_contains_new_endpoints(self, client):
        """L'endpoint / doit lister les nouveaux endpoints."""
        response = client.get("/")
        data = response.json()

        endpoints = data.get("endpoints", {})
        assert "ia_analyze" in endpoints
        assert "user_analyze" in endpoints
        assert "compare" in endpoints
        assert "constants" in endpoints


class TestHealthEndpoint:
    """Tests pour l'endpoint /health"""

    def test_health_returns_200(self, client):
        """L'endpoint /health doit retourner un statut 200."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_returns_healthy_status(self, client):
        """L'endpoint /health doit retourner status: healthy."""
        response = client.get("/health")
        data = response.json()

        assert "status" in data
        assert data["status"] == "healthy"


class TestConstantsEndpoint:
    """Tests pour l'endpoint /constants"""

    def test_constants_returns_200(self, client):
        """L'endpoint /constants doit retourner 200."""
        response = client.get("/constants")
        assert response.status_code == 200

    def test_constants_contains_categories(self, client):
        """La réponse doit contenir les catégories de risques."""
        response = client.get("/constants")
        data = response.json()

        assert "categories" in data
        assert isinstance(data["categories"], list)
        assert len(data["categories"]) == 3

    def test_constants_contains_types(self, client):
        """La réponse doit contenir les types de risques."""
        response = client.get("/constants")
        data = response.json()

        assert "types" in data
        assert isinstance(data["types"], list)
        assert len(data["types"]) == 4

    def test_constants_contains_sectors(self, client):
        """La réponse doit contenir les secteurs."""
        response = client.get("/constants")
        data = response.json()

        assert "sectors" in data
        assert isinstance(data["sectors"], list)

    def test_constants_contains_kinney_thresholds(self, client):
        """La réponse doit contenir les seuils Kinney."""
        response = client.get("/constants")
        data = response.json()

        assert "kinney_thresholds" in data
        thresholds = data["kinney_thresholds"]
        assert "Faible" in thresholds
        assert "Modéré" in thresholds
        assert "Élevé" in thresholds


class TestDocsEndpoint:
    """Tests pour la documentation Swagger."""

    def test_docs_available(self, client):
        """La documentation Swagger doit être accessible."""
        response = client.get("/docs")
        assert response.status_code == 200

    def test_redoc_available(self, client):
        """La documentation ReDoc doit être accessible."""
        response = client.get("/redoc")
        assert response.status_code == 200

    def test_openapi_schema_available(self, client):
        """Le schéma OpenAPI doit être accessible."""
        response = client.get("/openapi.json")
        assert response.status_code == 200

        data = response.json()
        assert "openapi" in data
        assert "info" in data
        assert "paths" in data
