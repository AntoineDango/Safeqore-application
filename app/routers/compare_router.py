"""
Router pour la comparaison entre l'analyse humaine et l'analyse IA.
Permet de confronter l'évaluation de l'utilisateur avec celle de l'IA.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from app.services.llm_service import call_llm_for_risk
from app.services.ml_service import predict_classification
from app.utils.normalize import kinney_score, classify_from_score
from app.constants import RISK_CATEGORIES, RISK_TYPES

router = APIRouter(tags=["Comparaison Humain vs IA"])


class CompareRequest(BaseModel):
    """Requête de comparaison humain vs IA."""
    description: str = Field(..., description="Description du risque à analyser")
    category: str = Field(..., description="Catégorie du risque")
    type: str = Field(..., description="Type de risque")
    sector: Optional[str] = Field("", description="Secteur d'activité")

    # Évaluation humaine
    user_G: int = Field(..., ge=1, le=5, description="Gravité évaluée par l'humain (1-5)")
    user_F: int = Field(..., ge=1, le=5, description="Fréquence évaluée par l'humain (1-5)")
    user_P: int = Field(..., ge=1, le=5, description="Probabilité évaluée par l'humain (1-5)")
    user_classification: Optional[str] = Field(
        None,
        description="Classification manuelle par l'humain (optionnel)"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "description": "Risque de cyberattaque sur le système de paiement en ligne",
                "category": "Industriel",
                "type": "Cyber & SSI",
                "sector": "Technologie",
                "user_G": 4,
                "user_F": 3,
                "user_P": 3,
                "user_classification": "Moyen"
            }
        }
    }


class AnalysisDetail(BaseModel):
    """Détail d'une analyse (humaine ou IA)."""
    G: int
    F: int
    P: int
    score: int
    classification: str


class IAAnalysisDetail(BaseModel):
    """Détail de l'analyse IA avec causes et recommandations."""
    G: int
    F: int
    P: int
    score: int
    classification: str
    causes: List[str] = Field(default=[], description="Causes racines identifiées")
    recommendations: List[str] = Field(default=[], description="Recommandations détaillées")
    justification: Optional[str] = Field(None, description="Justification des valeurs G, F, P")


class CompareResponse(BaseModel):
    """Réponse de la comparaison humain vs IA."""
    description: str = Field(..., description="Description du risque analysé")
    category: str = Field(..., description="Catégorie")
    type: str = Field(..., description="Type")

    # Analyse humaine
    human_analysis: AnalysisDetail = Field(..., description="Analyse réalisée par l'humain")

    # Analyse IA avec causes et recommandations détaillées
    ia_analysis: IAAnalysisDetail = Field(..., description="Analyse réalisée par l'IA avec causes et recommandations")

    # Comparaison
    comparison: dict = Field(..., description="Résultat de la comparaison")


def calculate_difference(human_val: int, ia_val: int) -> dict:
    """Calcule la différence entre valeurs humaine et IA."""
    diff = human_val - ia_val
    if diff == 0:
        assessment = "identique"
    elif diff > 0:
        assessment = "humain plus élevé"
    else:
        assessment = "IA plus élevée"

    return {
        "human": human_val,
        "ia": ia_val,
        "difference": abs(diff),
        "assessment": assessment
    }


@router.post("/compare", response_model=CompareResponse)
async def compare_human_vs_ia(request: CompareRequest):
    """
    Compare l'analyse de risque humaine avec l'analyse IA.

    Cette endpoint permet de :
    1. Soumettre l'évaluation humaine (G, F, P)
    2. Obtenir l'évaluation de l'IA pour le même risque
    3. Comparer les deux analyses point par point
    4. Identifier les divergences et leurs causes possibles

    Utile pour :
    - Calibrer les évaluations humaines
    - Identifier les biais d'évaluation
    - Former les analystes de risques
    - Valider les analyses critiques
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

    # Calcul analyse humaine
    human_score = kinney_score(request.user_G, request.user_F, request.user_P)
    human_classification = request.user_classification or classify_from_score(human_score)

    # Analyse IA
    llm_out = call_llm_for_risk(request.description, request.category, request.type, request.sector)

    if llm_out is None:
        raise HTTPException(status_code=503, detail="Service IA indisponible. Réessayez plus tard.")

    try:
        ia_G = int(llm_out.get("G"))
        ia_F = int(llm_out.get("F"))
        ia_P = int(llm_out.get("P"))
        ia_causes = llm_out.get("causes", [])
        ia_recommendations = llm_out.get("recommendations", [])
        ia_justification = llm_out.get("justification", "")
    except Exception:
        raise HTTPException(status_code=502, detail="Réponse IA malformée")

    ia_score = kinney_score(ia_G, ia_F, ia_P)
    ia_classification = classify_from_score(ia_score)

    # Comparaison détaillée
    g_comparison = calculate_difference(request.user_G, ia_G)
    f_comparison = calculate_difference(request.user_F, ia_F)
    p_comparison = calculate_difference(request.user_P, ia_P)
    score_comparison = calculate_difference(human_score, ia_score)

    # Déterminer l'accord global
    classifications_match = human_classification == ia_classification
    scores_close = abs(human_score - ia_score) <= 10  # Tolérance de 10 points

    if classifications_match and scores_close:
        agreement_level = "fort"
        agreement_message = "L'analyse humaine et l'IA sont en accord."
    elif classifications_match:
        agreement_level = "modéré"
        agreement_message = "Les classifications concordent mais les scores diffèrent significativement."
    elif scores_close:
        agreement_level = "modéré"
        agreement_message = "Les scores sont proches mais les classifications diffèrent (zone limite)."
    else:
        agreement_level = "faible"
        agreement_message = "Divergence significative entre l'analyse humaine et l'IA. Une revue est recommandée."

    # Identifier le facteur de plus grande divergence
    max_diff_factor = max(
        [("G (Gravité)", g_comparison["difference"]),
         ("F (Fréquence)", f_comparison["difference"]),
         ("P (Probabilité)", p_comparison["difference"])],
        key=lambda x: x[1]
    )

    comparison = {
        "G": g_comparison,
        "F": f_comparison,
        "P": p_comparison,
        "score": score_comparison,
        "classifications_match": classifications_match,
        "agreement_level": agreement_level,
        "agreement_message": agreement_message,
        "max_divergence_factor": max_diff_factor[0] if max_diff_factor[1] > 0 else None,
        "recommendations": []
    }

    # Ajouter des recommandations basées sur les divergences
    if not classifications_match:
        if human_classification == "Faible" and ia_classification in ["Moyen", "Eleve"]:
            comparison["recommendations"].append(
                "⚠️ L'IA évalue ce risque plus sévèrement. Vérifiez si certains impacts n'ont pas été sous-estimés."
            )
        elif human_classification == "Eleve" and ia_classification in ["Faible", "Moyen"]:
            comparison["recommendations"].append(
                "💡 L'IA évalue ce risque moins sévèrement. Vérifiez si des mesures de mitigation existantes n'ont pas été prises en compte."
            )

    if g_comparison["difference"] >= 2:
        comparison["recommendations"].append(
            f"📊 Écart important sur la Gravité ({g_comparison['difference']} points). Revoyez l'impact potentiel."
        )

    if f_comparison["difference"] >= 2:
        comparison["recommendations"].append(
            f"📊 Écart important sur la Fréquence ({f_comparison['difference']} points). Revoyez la fréquence d'exposition."
        )

    if p_comparison["difference"] >= 2:
        comparison["recommendations"].append(
            f"📊 Écart important sur la Probabilité ({p_comparison['difference']} points). Revoyez la vraisemblance."
        )

    return CompareResponse(
        description=request.description,
        category=request.category,
        type=request.type,
        human_analysis=AnalysisDetail(
            G=request.user_G,
            F=request.user_F,
            P=request.user_P,
            score=human_score,
            classification=human_classification
        ),
        ia_analysis=IAAnalysisDetail(
            G=ia_G,
            F=ia_F,
            P=ia_P,
            score=ia_score,
            classification=ia_classification,
            causes=ia_causes,
            recommendations=ia_recommendations,
            justification=ia_justification
        ),
        comparison=comparison
    )
