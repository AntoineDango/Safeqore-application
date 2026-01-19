"""
Router pour l'analyse utilisateur des risques.
Permet aux utilisateurs de mener leur propre analyse avec leurs propres évaluations G, F, P.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from app.services.enrichment_service import add_feedback, load_feedback_data
from app.utils.normalize import kinney_score, classify_from_score
from app.constants import RISK_CATEGORIES, RISK_TYPES, SECTORS

router = APIRouter(prefix="/user", tags=["Analyse Utilisateur"])


class UserAnalyzeRequest(BaseModel):
    """Requête d'analyse de risque par l'utilisateur."""
    description: str = Field(..., description="Description du risque")
    category: str = Field(..., description="Catégorie du risque")
    type: str = Field(..., description="Type de risque")
    G: int = Field(..., ge=1, le=5, description="Gravité évaluée par l'utilisateur (1-5)")
    F: int = Field(..., ge=1, le=5, description="Fréquence évaluée par l'utilisateur (1-5)")
    P: int = Field(..., ge=1, le=5, description="Probabilité évaluée par l'utilisateur (1-5)")
    classification: Optional[str] = Field(
        None,
        description="Classification manuelle par l'utilisateur (Faible, Moyen, Eleve). Si non fournie, calculée automatiquement."
    )
    sector: Optional[str] = Field("", description="Secteur d'activité")
    mitigation: Optional[str] = Field("", description="Solution de contournement ou de résolution proposée")

    model_config = {
        "json_schema_extra": {
            "example": {
                "description": "Risque de panne du serveur de base de données principal",
                "category": "Industriel",
                "type": "Technique",
                "G": 4,
                "F": 2,
                "P": 3,
                "classification": "Moyen",
                "sector": "Technologie",
                "mitigation": "Mise en place d'une réplication automatique et de sauvegardes quotidiennes"
            }
        }
    }


class UserAnalyzeResponse(BaseModel):
    """Réponse de l'analyse utilisateur."""
    id: str = Field(..., description="Identifiant unique de l'analyse")
    timestamp: str = Field(..., description="Date et heure de l'analyse")
    description: str = Field(..., description="Description du risque")
    category: str = Field(..., description="Catégorie du risque")
    type: str = Field(..., description="Type de risque")
    G: int = Field(..., description="Gravité")
    F: int = Field(..., description="Fréquence")
    P: int = Field(..., description="Probabilité")
    score: int = Field(..., description="Score Kinney calculé (G × F × P)")
    computed_classification: str = Field(..., description="Classification calculée selon le score Kinney")
    user_classification: Optional[str] = Field(None, description="Classification fournie par l'utilisateur")
    mitigation: Optional[str] = Field(None, description="Solution de contournement")
    sector: Optional[str] = Field(None, description="Secteur d'activité")


class UserAnalysisListResponse(BaseModel):
    """Réponse de la liste des analyses."""
    total: int = Field(..., description="Nombre total d'analyses")
    limit: int = Field(..., description="Limite de résultats")
    offset: int = Field(..., description="Décalage")
    analyses: List[dict] = Field(..., description="Liste des analyses")


@router.post("/analyze", response_model=UserAnalyzeResponse)
async def user_analyze(request: UserAnalyzeRequest):
    """
    Désactivé: la saisie directe de G/F/P est interdite par le STB.
    Le questionnaire est la SOURCE UNIQUE de G, F, P (analyse initiale et résiduelle).
    Utilisez l'endpoint POST /questionnaire/analyze.
    """
    # Verrou produit (STB): empêcher toute saisie directe de G/F/P
    raise HTTPException(
        status_code=410,
        detail=(
            "Saisie directe de G/F/P interdite. Utilisez le questionnaire (POST /questionnaire/analyze). "
            "Conformité STB: Questionnaire = source unique de G/F/P."
        ),
    )


@router.get("/analyses", response_model=UserAnalysisListResponse)
async def list_user_analyses(limit: int = 50, offset: int = 0):
    """
    Liste les analyses de risques réalisées par les utilisateurs.

    Paramètres de pagination :
    - limit : nombre maximum de résultats (défaut: 50)
    - offset : décalage pour la pagination (défaut: 0)
    """
    data = load_feedback_data()
    total = len(data)
    paginated = data[offset:offset + limit]

    return UserAnalysisListResponse(
        total=total,
        limit=limit,
        offset=offset,
        analyses=paginated
    )


@router.get("/analyses/{analysis_id}")
async def get_user_analysis(analysis_id: str):
    """
    Récupère une analyse utilisateur spécifique par son ID.
    """
    data = load_feedback_data()

    for analysis in data:
        if analysis.get("id") == analysis_id:
            return analysis

    raise HTTPException(status_code=404, detail=f"Analyse {analysis_id} non trouvée")
