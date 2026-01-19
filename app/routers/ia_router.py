"""
Router pour l'analyse IA des risques.
Endpoint principal pour l'analyse automatisée par LLM + ML.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from app.services.llm_service import call_llm_for_risk
from app.services.ml_service import predict_classification
from app.utils.normalize import kinney_score, classify_from_score
from app.constants import RISK_CATEGORIES, RISK_TYPES, SECTORS

router = APIRouter(prefix="/ia", tags=["Analyse IA"])


class IAAnalyzeRequest(BaseModel):
    """Requête d'analyse de risque par l'IA."""
    description: str = Field(..., description="Description détaillée du risque à analyser")
    category: str = Field(..., description="Catégorie du risque (Projet/Programme, Industriel, Qualité)")
    type: str = Field(..., description="Type de risque (Commercial, Financier, Technique, Cyber & SSI)")
    sector: Optional[str] = Field("", description="Secteur d'activité (optionnel)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "description": "Cyberattaque par ransomware sur les serveurs de production contenant des données clients sensibles",
                "category": "Industriel",
                "type": "Cyber & SSI",
                "sector": "Technologie"
            }
        }
    }


class IAAnalyzeResponse(BaseModel):
    """Réponse de l'analyse IA avec causes et recommandations détaillées."""
    G: int = Field(..., description="Gravité (1-5)")
    F: int = Field(..., description="Fréquence (1-5)")
    P: int = Field(..., description="Probabilité (1-5)")
    score: int = Field(..., description="Score Kinney (G × F × P)")
    classification: str = Field(..., description="Classification finale (Faible, Modéré, Élevé)")
    ml_classification: Optional[str] = Field(None, description="Classification du modèle ML")
    llm_classification: Optional[str] = Field(None, description="Classification du LLM")
    causes: List[str] = Field(default=[], description="Causes racines identifiées par l'IA")
    recommendations: List[str] = Field(default=[], description="Recommandations détaillées et actionnables")
    justification: Optional[str] = Field(None, description="Justification des valeurs G, F, P")


@router.post("/analyze", response_model=IAAnalyzeResponse)
async def ia_analyze(request: IAAnalyzeRequest):
    """
    Analyse un risque via l'Intelligence Artificielle.

    L'analyse utilise :
    1. Un LLM (Large Language Model) pour évaluer G, F, P et générer une recommandation
    2. Un modèle ML pour valider la classification
    3. La méthodologie Kinney pour calculer le score final

    La classification finale est déterminée par le score Kinney :
    - Faible : 1-25
    - Modéré : 26-50
    - Élevé : 51-125
    """
    # Validation des entrées
    if request.category not in RISK_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Catégorie invalide. Valeurs acceptées: {RISK_CATEGORIES}"
        )

    if request.type not in RISK_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Type invalide. Valeurs acceptées: {RISK_TYPES}"
        )

    # 1) Analyse LLM
    llm_out = call_llm_for_risk(request.description, request.category, request.type, request.sector)
    if llm_out is None:
        raise HTTPException(status_code=503, detail="Service IA indisponible. Réessayez plus tard.")

    try:
        G = int(llm_out.get("G"))
        F = int(llm_out.get("F"))
        P = int(llm_out.get("P"))
        llm_class = llm_out.get("llm_classification")
        causes = llm_out.get("causes", [])
        recommendations = llm_out.get("recommendations", [])
        justification = llm_out.get("justification", "")
    except Exception:
        raise HTTPException(status_code=502, detail="Réponse IA malformée")

    # 2) Validation ML
    ml_out = predict_classification(G, F, P, request.category, request.type)
    ml_class = ml_out.get("ml_classification")

    # 3) Calcul score Kinney et classification finale
    score = kinney_score(G, F, P)
    kinney_class = classify_from_score(score)

    # La classification Kinney (déterministe) prévaut en cas de conflit
    final_class = kinney_class

    return IAAnalyzeResponse(
        G=G,
        F=F,
        P=P,
        score=score,
        classification=final_class,
        ml_classification=ml_class,
        llm_classification=llm_class,
        causes=causes,
        recommendations=recommendations,
        justification=justification
    )


@router.get("/compliance")
async def ia_compliance():
    """Expose des informations de conformité IA (sources ouvertes, versions, avertissements)."""
    return {
        "llm": {
            "provider": "Groq (Open "
            "LLM)",
            "notes": "L'IA est une aide. La décision finale appartient à l'utilisateur.",
        },
        "ml": {
            "models": ["xgboost", "lightgbm"],
            "training_data": "Open data synthétique (non personnel)",
        },
        "methodology": {
            "name": "Kinney",
            "classification": {
                "Faible": "1-25",
                "Modéré": "26-50",
                "Élevé": "51-125"
            }
        },
        "disclaimer": "Ce service IA est fourni à titre d'assistance. Les utilisateurs restent responsables des décisions et validations de risques."
    }
