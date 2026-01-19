"""
Router pour l'administration du système SafeQore.
Endpoints pour la maintenance, le statut et le ré-entraînement du modèle.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from app.services.enrichment_service import (
    get_feedback_stats,
    get_training_status,
    retrain_model
)
from app.constants import RISK_CATEGORIES, RISK_TYPES, SECTORS

router = APIRouter(prefix="/admin", tags=["Administration"])


class ConstantsResponse(BaseModel):
    """Constantes STB disponibles."""
    categories: List[str] = Field(..., description="Catégories de risques")
    types: List[str] = Field(..., description="Types de risques")
    sectors: List[str] = Field(..., description="Secteurs d'activité")
    classifications: List[str] = Field(..., description="Niveaux de classification")
    kinney_scale: dict = Field(..., description="Échelle Kinney (seuils)")


class StatusResponse(BaseModel):
    """Statut du système."""
    is_training: bool = Field(..., description="Entraînement en cours")
    model_ready: bool = Field(..., description="Modèle prêt")
    feedback_data: dict = Field(..., description="Statistiques des données")
    scenarios_count: int = Field(..., description="Nombre de scénarios")


class RetrainResponse(BaseModel):
    """Réponse du ré-entraînement."""
    success: bool
    message: str
    metrics: Optional[dict] = None


@router.get("/status", response_model=StatusResponse)
async def get_system_status():
    """
    Retourne le statut actuel du système SafeQore.

    Informations incluses :
    - État de l'entraînement
    - Disponibilité du modèle
    - Statistiques des données de feedback
    - Nombre de scénarios d'entraînement
    """
    status = get_training_status()

    return StatusResponse(
        is_training=status.get("is_training", False),
        model_ready=not status.get("is_training", False),
        feedback_data=status.get("feedback_data", {}),
        scenarios_count=status.get("scenarios_count", 0)
    )


@router.post("/retrain", response_model=RetrainResponse)
async def retrain_ml_model(force: bool = False):
    """
    Déclenche le ré-entraînement du modèle ML.

    Le ré-entraînement utilise :
    - Les scénarios prédéfinis
    - Les analyses utilisateur (feedbacks)
    - Des données synthétiques générées

    Paramètres :
    - force : forcer le ré-entraînement même si un autre est en cours
    """
    status = get_training_status()

    if status["is_training"] and not force:
        return RetrainResponse(
            success=False,
            message="Un entraînement est déjà en cours. Utilisez force=true pour forcer.",
            metrics=None
        )

    # Vérifier qu'il y a des données
    if status["feedback_data"]["pending_training"] == 0 and status["scenarios_count"] == 0:
        return RetrainResponse(
            success=False,
            message="Aucune nouvelle donnée disponible pour l'entraînement",
            metrics=None
        )

    result = retrain_model(force=force)

    return RetrainResponse(
        success=result["success"],
        message=result["message"],
        metrics=result.get("metrics")
    )


@router.get("/stats")
async def get_feedback_statistics():
    """
    Retourne les statistiques détaillées des analyses utilisateur.
    """
    return get_feedback_stats()
