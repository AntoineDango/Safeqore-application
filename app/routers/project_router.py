"""
Router pour les projets d'analyse de risques
Gère la création, modification et consultation de projets avec plusieurs risques
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
import os
import json

from app.auth.dependencies import get_current_user
from app.models.project_schemas import (
    AnalysisProject,
    CreateProjectRequest,
    AddRiskRequest,
    UpdateRiskMitigationRequest,
    ProjectListResponse,
    ProjectSummaryListResponse,
    ProjectSummary,
    RiskItem,
    RiskEvaluation,
    RiskLevel,
    UpdateProjectRequest,
    DuplicateProjectRequest,
    ProjectIAAnalysisResponse,
    RiskComparison,
    IAAnalysisItem,
    ComparisonResult,
)
from app.services.llm_service import call_llm_for_risk

router = APIRouter(prefix="/projects", tags=["Projects"])

# Stockage JSON
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TRAINING_DATA_DIR = os.path.join(BASE_DIR, "training", "data")
PROJECTS_FILE = os.path.join(TRAINING_DATA_DIR, "analysis_projects.json")

os.makedirs(TRAINING_DATA_DIR, exist_ok=True)


def _load_projects() -> List[dict]:
    """Charge tous les projets depuis le fichier JSON"""
    if os.path.exists(PROJECTS_FILE):
        try:
            with open(PROJECTS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def _save_projects(projects: List[dict]):
    """Sauvegarde tous les projets dans le fichier JSON"""
    with open(PROJECTS_FILE, "w", encoding="utf-8") as f:
        json.dump(projects, f, indent=2, ensure_ascii=False)


def _calculate_risk_level(score: int) -> RiskLevel:
    """Calcule le niveau de risque selon la méthode Kinney"""
    if score <= 25:
        return "Faible"
    elif score <= 50:
        return "Moyen"
    return "Élevé"


def _is_low_risk(initial_eval: dict | None) -> bool:
    """Retourne True si l'évaluation initiale correspond à un risque faible.
    Règles (OR):
      - level == "Faible"
      - score brut (G*F*P) <= 25
      - normalized_score_100 <= 20 (si présent)
    """
    if not initial_eval:
        return False
    level = initial_eval.get("level")
    if level == "Faible":
        return True
    # Normalized threshold
    try:
        norm100 = initial_eval.get("normalized_score_100")
        if norm100 is not None and float(norm100) <= 20:
            return True
    except Exception:
        pass
    # Raw score or recompute from G,F,P
    score = initial_eval.get("score")
    try:
        if score is None:
            g = int(initial_eval.get("G", 0))
            f = int(initial_eval.get("F", 0))
            p = int(initial_eval.get("P", 0))
            score = g * f * p
        else:
            score = int(score)
    except Exception:
        score = 0
    return score <= 25


def _generate_project_id() -> str:
    """Génère un ID unique pour un projet"""
    return f"PROJ_{datetime.now().strftime('%Y%m%d%H%M%S')}_{len(_load_projects())}"


def _generate_risk_id(project_id: str) -> str:
    """Génère un ID unique pour un risque"""
    return f"{project_id}_RISK_{datetime.now().strftime('%H%M%S%f')}"


@router.post("/", response_model=AnalysisProject)
async def create_project(
    payload: CreateProjectRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Crée un nouveau projet d'analyse de risques
    """
    user_uid = current_user["uid"]
    user_email = current_user.get("email", "")
    
    project_id = _generate_project_id()
    
    project = {
        "id": project_id,
        "project_type": payload.project_type,
        "project_description": payload.project_description,
        "entity_type": payload.entity_type,
        "entity_services": payload.entity_services,
        "analysis_title": payload.analysis_title,
        "sector": payload.sector,
        "risks": [],
        "user_uid": user_uid,
        "user_email": user_email,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "status": "draft",
    }
    
    projects = _load_projects()
    projects.append(project)
    _save_projects(projects)
    
    print(f"[ProjectRouter] Project {project_id} created for user {user_uid}")
    
    return AnalysisProject(**project)


@router.get("/", response_model=ProjectSummaryListResponse)
async def list_projects(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """
    Liste tous les projets de l'utilisateur connecté
    """
    user_uid = current_user["uid"]
    
    all_projects = _load_projects()
    user_projects = [p for p in all_projects if p.get("user_uid") == user_uid]
    
    # Trier par date de mise à jour (plus récent en premier)
    user_projects.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
    
    total = len(user_projects)
    paginated = user_projects[offset:offset + limit]
    
    # Créer des résumés
    summaries = []
    for p in paginated:
        risks = p.get("risks", [])
        # Nouvelle règle: considérer tous les risques comme traités pour l'avancement
        completed_risks = len(risks)
        
        summaries.append(ProjectSummary(
            id=p["id"],
            analysis_title=p["analysis_title"],
            project_type=p["project_type"],
            entity_type=p.get("entity_type"),
            sector=p.get("sector"),
            risks_count=len(risks),
            completed_risks_count=completed_risks,
            status=p.get("status", "draft"),
            created_at=p["created_at"],
            updated_at=p["updated_at"],
        ))
    
    return ProjectSummaryListResponse(
        total=total,
        limit=limit,
        offset=offset,
        projects=summaries
    )


@router.get("/{project_id}", response_model=AnalysisProject)
async def get_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Récupère un projet spécifique
    """
    user_uid = current_user["uid"]
    
    projects = _load_projects()
    project = next((p for p in projects if p["id"] == project_id), None)
    
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    if project.get("user_uid") != user_uid:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    return AnalysisProject(**project)


@router.post("/{project_id}/risks", response_model=RiskItem)
async def add_risk_to_project(
    project_id: str,
    payload: AddRiskRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Ajoute un risque au projet avec son évaluation initiale
    """
    user_uid = current_user["uid"]
    
    projects = _load_projects()
    project = next((p for p in projects if p["id"] == project_id), None)
    
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    if project.get("user_uid") != user_uid:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Calculer l'évaluation initiale
    initial_score = payload.G * payload.F * payload.P
    initial_level = _calculate_risk_level(initial_score)
    
    risk_id = _generate_risk_id(project_id)
    
    risk = {
        "id": risk_id,
        "description": payload.description,
        "category": payload.category,
        "type": payload.type,
        "initial_evaluation": {
            "G": payload.G,
            "F": payload.F,
            "P": payload.P,
            "score": initial_score,
            "level": initial_level,
        },
        "mitigation_measure": "",
        "residual_evaluation": None,
        "created_at": datetime.now().isoformat(),
    }
    
    project["risks"].append(risk)
    project["updated_at"] = datetime.now().isoformat()
    # Nouvelle règle: projet complété dès qu'il a >= 4 risques
    if len(project["risks"]) >= 4:
        project["status"] = "completed"
    
    _save_projects(projects)
    
    print(f"[ProjectRouter] Risk {risk_id} added to project {project_id}")
    
    return RiskItem(**risk)


@router.put("/{project_id}/risks/{risk_id}/mitigation", response_model=RiskItem)
async def update_risk_mitigation(
    project_id: str,
    risk_id: str,
    payload: UpdateRiskMitigationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Met à jour la mesure de contournement et l'évaluation résiduelle d'un risque
    """
    user_uid = current_user["uid"]
    
    projects = _load_projects()
    project = next((p for p in projects if p["id"] == project_id), None)
    
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    if project.get("user_uid") != user_uid:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    risk = next((r for r in project["risks"] if r["id"] == risk_id), None)
    
    if not risk:
        raise HTTPException(status_code=404, detail="Risque non trouvé")
    
    # Calculer l'évaluation résiduelle
    residual_score = payload.residual_G * payload.residual_F * payload.residual_P
    residual_level = _calculate_risk_level(residual_score)
    
    risk["mitigation_measure"] = payload.mitigation_measure
    risk["residual_evaluation"] = {
        "G": payload.residual_G,
        "F": payload.residual_F,
        "P": payload.residual_P,
        "score": residual_score,
        "level": residual_level,
    }
    
    project["updated_at"] = datetime.now().isoformat()
    
    # Nouvelle règle: projet complété dès qu'il a >= 4 risques
    if len(project["risks"]) >= 4:
        project["status"] = "completed"
    
    _save_projects(projects)
    
    print(f"[ProjectRouter] Risk {risk_id} mitigation updated in project {project_id}")
    
    return RiskItem(**risk)


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Supprime un projet
    """
    user_uid = current_user["uid"]
    
    projects = _load_projects()
    project = next((p for p in projects if p["id"] == project_id), None)
    
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    if project.get("user_uid") != user_uid:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    projects = [p for p in projects if p["id"] != project_id]
    _save_projects(projects)
    
    print(f"[ProjectRouter] Project {project_id} deleted by user {user_uid}")
    
    return {"status": "ok", "message": "Projet supprimé"}


@router.delete("/{project_id}/risks/{risk_id}")
async def delete_risk(
    project_id: str,
    risk_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Supprime un risque d'un projet
    """
    user_uid = current_user["uid"]
    
    projects = _load_projects()
    project = next((p for p in projects if p["id"] == project_id), None)
    
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    if project.get("user_uid") != user_uid:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    initial_count = len(project["risks"])
    project["risks"] = [r for r in project["risks"] if r["id"] != risk_id]
    
    if len(project["risks"]) == initial_count:
        raise HTTPException(status_code=404, detail="Risque non trouvé")
    
    project["updated_at"] = datetime.now().isoformat()
    
    # Mettre à jour le statut si nécessaire
    if len(project["risks"]) < 4:
        project["status"] = "draft"
    
    _save_projects(projects)
    
    print(f"[ProjectRouter] Risk {risk_id} deleted from project {project_id}")
    
    return {"status": "ok", "message": "Risque supprimé"}


@router.put("/{project_id}/status", response_model=AnalysisProject)
async def update_project_status(
    project_id: str,
    payload: dict,  # {"status": "draft" | "completed"}
    current_user: dict = Depends(get_current_user)
):
    """
    Met à jour uniquement le statut d'un projet
    """
    user_uid = current_user["uid"]
    
    projects = _load_projects()
    project = next((p for p in projects if p["id"] == project_id), None)
    
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    if project.get("user_uid") != user_uid:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    new_status = payload.get("status")
    if new_status not in ["draft", "completed"]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    project["status"] = new_status
    project["updated_at"] = datetime.now().isoformat()
    
    _save_projects(projects)
    
    print(f"[ProjectRouter] Project {project_id} status updated to {new_status} by user {user_uid}")
    
    return AnalysisProject(**project)


@router.post("/{project_id}/duplicate", response_model=AnalysisProject)
async def duplicate_project(
    project_id: str,
    payload: DuplicateProjectRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Duplique un projet avec tous ses risques
    """
    user_uid = current_user["uid"]
    user_email = current_user.get("email", "")
    
    projects = _load_projects()
    source_project = next((p for p in projects if p["id"] == project_id), None)
    
    if not source_project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    if source_project.get("user_uid") != user_uid:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Générer un nouveau ID et titre
    new_project_id = _generate_project_id()
    
    if payload.new_title:
        new_title = payload.new_title
    else:
        # Ajouter _v2 au titre
        original_title = source_project["analysis_title"]
        if "_v2" in original_title:
            # Si déjà un _v2, incrémenter
            import re
            match = re.search(r'_v(\d+)$', original_title)
            if match:
                version = int(match.group(1)) + 1
                new_title = re.sub(r'_v\d+$', f'_v{version}', original_title)
            else:
                new_title = f"{original_title}_v2"
        else:
            new_title = f"{original_title}_v2"
    
    # Créer le nouveau projet
    new_project = {
        "id": new_project_id,
        "project_type": source_project["project_type"],
        "project_description": source_project["project_description"],
        "entity_type": source_project.get("entity_type"),
        "entity_services": source_project.get("entity_services"),
        "analysis_title": new_title,
        "sector": source_project.get("sector"),
        "risks": [],
        "user_uid": user_uid,
        "user_email": user_email,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "status": "draft",
    }
    
    # Dupliquer tous les risques
    for source_risk in source_project.get("risks", []):
        new_risk_id = _generate_risk_id(new_project_id)
        
        new_risk = {
            "id": new_risk_id,
            "description": source_risk["description"],
            "category": source_risk["category"],
            "type": source_risk["type"],
            "initial_evaluation": source_risk["initial_evaluation"].copy(),
            "mitigation_measure": source_risk.get("mitigation_measure", ""),
            "residual_evaluation": source_risk["residual_evaluation"].copy() if source_risk.get("residual_evaluation") else None,
            "created_at": datetime.now().isoformat(),
        }
        
        new_project["risks"].append(new_risk)
    
    # Nouvelle règle: statut complété si le projet a >= 4 risques
    if len(new_project["risks"]) >= 4:
        new_project["status"] = "completed"
    
    projects.append(new_project)
    _save_projects(projects)
    
    print(f"[ProjectRouter] Project {project_id} duplicated to {new_project_id} by user {user_uid}")
    
    return AnalysisProject(**new_project)


@router.post("/{project_id}/ai-analysis", response_model=ProjectIAAnalysisResponse)
async def analyze_project_with_ia(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Lance une analyse IA comparative pour tous les risques d'un projet
    Valide que tous les risques ont une mesure de contournement et une évaluation résiduelle
    """
    user_uid = current_user["uid"]
    
    projects = _load_projects()
    project = next((p for p in projects if p["id"] == project_id), None)
    
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")
    
    if project.get("user_uid") != user_uid:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    risks = project.get("risks", [])
    
    if len(risks) == 0:
        raise HTTPException(status_code=400, detail="Le projet ne contient aucun risque")
    
    # Vérifications supprimées - l'analyse IA est maintenant autorisée pour tous les risques
    # ayant une évaluation initiale, indépendamment des mesures de mitigation
    
    # Statistiques de debug uniquement (pas de blocage)
    debug_counts = {"total": len(risks), "with_mitigation": 0, "without_mitigation": 0}
    for r in risks:
        has_mitigation = bool(r.get("mitigation_measure") and r.get("residual_evaluation"))
        if has_mitigation:
            debug_counts["with_mitigation"] += 1
        else:
            debug_counts["without_mitigation"] += 1
    
    print(f"[ProjectRouter] IA analysis for {project_id}: {debug_counts}")
    print(f"[ProjectRouter] ✅ IA analysis ALLOWED for all projects with initial evaluations")
    
    # Lancer l'analyse IA pour chaque risque
    comparisons = []
    sector = project.get("sector", "Général")
    
    for risk in risks:
        try:
            # Analyser le risque avec l'IA
            ia_result = call_llm_for_risk(
                description=risk["description"],
                category=risk["category"],
                typ=risk["type"],
                sector=sector
            )
            
            if not ia_result:
                # Si l'IA échoue, utiliser des valeurs par défaut
                ia_result = {
                    "G": 3,
                    "F": 3,
                    "P": 3,
                    "llm_classification": "Moyen",
                    "causes": ["Analyse IA non disponible"],
                    "recommendations": ["Veuillez réessayer ultérieurement"],
                    "justification": "Analyse IA non disponible"
                }
            
            # Calculer le score IA
            ia_score = ia_result.get("G", 3) * ia_result.get("F", 3) * ia_result.get("P", 3)
            ia_classification = _calculate_risk_level(ia_score)
            
            # Récupérer l'analyse humaine
            human_eval = risk["initial_evaluation"]
            human_score = human_eval["score"]
            human_classification = human_eval["level"]
            
            # Calculer la comparaison
            score_diff = abs(human_score - ia_score)
            classifications_match = (human_classification == ia_classification)
            
            # Déterminer le niveau d'accord
            if score_diff <= 10 and classifications_match:
                agreement_level = "Élevé"
            elif score_diff <= 25:
                agreement_level = "Moyen"
            else:
                agreement_level = "Faible"
            
            # Analyse textuelle
            if classifications_match:
                analysis_text = f"Les deux analyses concordent sur la classification '{human_classification}'."
            else:
                analysis_text = f"Divergence : Humain={human_classification}, IA={ia_classification}."
            
            if score_diff > 0:
                analysis_text += f" Différence de score : {score_diff} points."
            
            # Créer la comparaison
            comparison = RiskComparison(
                risk_id=risk["id"],
                risk_description=risk["description"],
                human_analysis=IAAnalysisItem(
                    G=human_eval["G"],
                    F=human_eval["F"],
                    P=human_eval["P"],
                    score=human_score,
                    classification=human_classification
                ),
                ia_analysis=IAAnalysisItem(
                    G=ia_result.get("G", 3),
                    F=ia_result.get("F", 3),
                    P=ia_result.get("P", 3),
                    score=ia_score,
                    classification=ia_classification,
                    causes=ia_result.get("causes", []),
                    recommendations=ia_result.get("recommendations", []),
                    justification=ia_result.get("justification", "")
                ),
                comparison=ComparisonResult(
                    agreement_level=agreement_level,
                    classifications_match=classifications_match,
                    score_difference=score_diff,
                    analysis=analysis_text
                )
            )
            
            comparisons.append(comparison)
            
        except Exception as e:
            print(f"[ProjectRouter] Error analyzing risk {risk['id']}: {e}")
            # Continuer avec les autres risques même en cas d'erreur
            continue
    
    if len(comparisons) == 0:
        raise HTTPException(status_code=500, detail="Impossible d'analyser les risques avec l'IA")
    
    print(f"[ProjectRouter] IA analysis completed for project {project_id}: {len(comparisons)} risks analyzed")
    
    return ProjectIAAnalysisResponse(
        project_id=project_id,
        comparisons=comparisons
    )
