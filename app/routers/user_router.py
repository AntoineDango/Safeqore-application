"""
Router pour l'analyse utilisateur des risques.
Permet aux utilisateurs de mener leur propre analyse avec leurs propres évaluations G, F, P.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
import os
import json
from app.utils.normalize import kinney_score, classify_from_score
from app.constants import RISK_CATEGORIES, RISK_TYPES, SECTORS
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/user", tags=["Analyse Utilisateur"])

# Utiliser le même fichier que le questionnaire
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TRAINING_DATA_DIR = os.path.join(BASE_DIR, "training", "data")
ANALYSES_FILE = os.path.join(TRAINING_DATA_DIR, "questionnaire_analyses.json")
PROFILES_FILE = os.path.join(TRAINING_DATA_DIR, "user_profiles.json")

def _load_analyses() -> List[dict]:
    if os.path.exists(ANALYSES_FILE):
        try:
            with open(ANALYSES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def _save_analyses(data: List[dict]) -> None:
    """Sauvegarde les analyses dans le fichier JSON."""
    os.makedirs(TRAINING_DATA_DIR, exist_ok=True)
    with open(ANALYSES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _load_profiles() -> List[dict]:
    """Charge les profils utilisateurs depuis le fichier JSON."""
    if os.path.exists(PROFILES_FILE):
        try:
            with open(PROFILES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def _save_profiles(data: List[dict]) -> None:
    """Sauvegarde les profils utilisateurs dans le fichier JSON."""
    os.makedirs(TRAINING_DATA_DIR, exist_ok=True)
    with open(PROFILES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


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
async def list_user_analyses(
    limit: int = 50, 
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """
    Liste les analyses de risques réalisées par l'utilisateur connecté.

    Paramètres de pagination :
    - limit : nombre maximum de résultats (défaut: 50)
    - offset : décalage pour la pagination (défaut: 0)
    
    Nécessite une authentification Firebase.
    """
    user_uid = current_user["uid"]
    print(f"[UserRouter] Listing analyses for user: {user_uid}")
    
    # Charger toutes les analyses depuis le fichier du questionnaire
    all_data = _load_analyses()
    
    # Filtrer uniquement les analyses de l'utilisateur connecté
    user_data = [
        analysis for analysis in all_data 
        if analysis.get("user_uid") == user_uid
    ]
    
    print(f"[UserRouter] Found {len(user_data)} analyses for user {user_uid} (total in file: {len(all_data)})")
    
    total = len(user_data)
    paginated = user_data[offset:offset + limit]

    return UserAnalysisListResponse(
        total=total,
        limit=limit,
        offset=offset,
        analyses=paginated
    )


@router.get("/analyses/{analysis_id}")
async def get_user_analysis(
    analysis_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Récupère une analyse utilisateur spécifique par son ID.
    Nécessite une authentification Firebase.
    """
    user_uid = current_user["uid"]
    data = _load_analyses()

    for analysis in data:
        if analysis.get("id") == analysis_id:
            # Vérifier que l'analyse appartient à l'utilisateur
            if analysis.get("user_uid") != user_uid:
                raise HTTPException(status_code=403, detail="Accès non autorisé à cette analyse")
            return analysis

    raise HTTPException(status_code=404, detail=f"Analyse {analysis_id} non trouvée")


@router.delete("/analyses/{analysis_id}")
async def delete_user_analysis(
    analysis_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Supprime une analyse utilisateur spécifique par son ID.
    Nécessite une authentification Firebase.
    L'utilisateur ne peut supprimer que ses propres analyses.
    """
    user_uid = current_user["uid"]
    print(f"[UserRouter] User {user_uid} attempting to delete analysis {analysis_id}")
    
    data = _load_analyses()
    analysis_found = False
    analysis_index = -1

    for i, analysis in enumerate(data):
        if analysis.get("id") == analysis_id:
            analysis_found = True
            # Vérifier que l'analyse appartient à l'utilisateur
            if analysis.get("user_uid") != user_uid:
                print(f"[UserRouter] Access denied: analysis belongs to {analysis.get('user_uid')}, not {user_uid}")
                raise HTTPException(status_code=403, detail="Accès non autorisé à cette analyse")
            analysis_index = i
            break

    if not analysis_found:
        print(f"[UserRouter] Analysis {analysis_id} not found")
        raise HTTPException(status_code=404, detail=f"Analyse {analysis_id} non trouvée")

    # Supprimer l'analyse
    deleted_analysis = data.pop(analysis_index)
    _save_analyses(data)
    
    print(f"[UserRouter] Successfully deleted analysis {analysis_id}")
    
    return {
        "status": "deleted",
        "id": analysis_id,
        "message": f"Analyse {analysis_id} supprimée avec succès"
    }


# ============================================================================
# GESTION DU PROFIL UTILISATEUR
# ============================================================================

class CompleteProfileRequest(BaseModel):
    """Requête pour compléter le profil utilisateur après l'inscription."""
    nom: str = Field(..., description="Nom de famille")
    prenom: str = Field(..., description="Prénom")
    fonction: str = Field(..., description="Fonction dans l'entreprise")
    entreprise: str = Field(..., description="Nom de l'entreprise ou entité")

    model_config = {
        "json_schema_extra": {
            "example": {
                "nom": "Dupont",
                "prenom": "Jean",
                "fonction": "Responsable Qualité",
                "entreprise": "SafeQore SAS"
            }
        }
    }


class ProfileResponse(BaseModel):
    """Réponse contenant les informations du profil utilisateur."""
    uid: str
    email: Optional[str] = None
    nom: Optional[str] = None
    prenom: Optional[str] = None
    fonction: Optional[str] = None
    entreprise: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@router.post("/profile/complete")
async def complete_profile(
    request: CompleteProfileRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Complète le profil utilisateur après l'inscription.
    Stocke les informations supplémentaires (nom, prénom, fonction, entreprise).
    """
    user_uid = current_user["uid"]
    user_email = current_user.get("email")
    
    print(f"[UserRouter] Completing profile for user {user_uid}")
    
    # Charger les profils existants
    profiles = _load_profiles()
    
    # Vérifier si le profil existe déjà
    profile_index = -1
    for i, profile in enumerate(profiles):
        if profile.get("uid") == user_uid:
            profile_index = i
            break
    
    # Créer ou mettre à jour le profil
    from datetime import datetime
    now = datetime.now().isoformat()
    
    profile_data = {
        "uid": user_uid,
        "email": user_email,
        "nom": request.nom,
        "prenom": request.prenom,
        "fonction": request.fonction,
        "entreprise": request.entreprise,
        "updated_at": now
    }
    
    if profile_index >= 0:
        # Mettre à jour le profil existant
        profile_data["created_at"] = profiles[profile_index].get("created_at", now)
        profiles[profile_index] = profile_data
        print(f"[UserRouter] Updated existing profile for user {user_uid}")
    else:
        # Créer un nouveau profil
        profile_data["created_at"] = now
        profiles.append(profile_data)
        print(f"[UserRouter] Created new profile for user {user_uid}")
    
    # Sauvegarder
    _save_profiles(profiles)
    
    return {
        "status": "success",
        "message": "Profil complété avec succès",
        "profile": profile_data
    }


@router.get("/profile/extended")
async def get_extended_profile(
    current_user: dict = Depends(get_current_user)
):
    """
    Récupère le profil étendu de l'utilisateur (avec nom, prénom, fonction, entreprise).
    """
    user_uid = current_user["uid"]
    user_email = current_user.get("email")
    
    print(f"[UserRouter] Getting extended profile for user {user_uid}")
    
    # Charger les profils
    profiles = _load_profiles()
    
    # Chercher le profil de l'utilisateur
    for profile in profiles:
        if profile.get("uid") == user_uid:
            print(f"[UserRouter] Found extended profile for user {user_uid}")
            return {
                "profile": profile
            }
    
    # Si le profil n'existe pas, retourner les infos de base
    print(f"[UserRouter] No extended profile found for user {user_uid}, returning basic info")
    return {
        "profile": {
            "uid": user_uid,
            "email": user_email,
            "nom": None,
            "prenom": None,
            "fonction": None,
            "entreprise": None
        }
    }
