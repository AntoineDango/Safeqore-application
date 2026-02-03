"""
Schémas pour les projets d'analyse de risques
Un projet contient plusieurs risques avec évaluations avant/après mesures
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime

# Types d'entité
EntityType = Literal["Startup", "TPE", "PME", "ETI", "Grands groupes", "Indépendant/auto-entrepreneur"]

# Catégories et types de risques
RiskCategory = Literal["Projet/Programme", "Industriel", "Qualité"]
RiskType = Literal["Commercial", "Financier", "Technique", "Cyber & SSI"]

# Niveaux de risque
RiskLevel = Literal["Faible", "Moyen", "Élevé"]


class RiskEvaluation(BaseModel):
    """Évaluation d'un risque (avant ou après mesure)"""
    G: int = Field(..., ge=1, le=5, description="Gravité (1-5)")
    F: int = Field(..., ge=1, le=5, description="Fréquence (1-5)")
    P: int = Field(..., ge=1, le=5, description="Probabilité (1-5)")
    score: int = Field(..., description="Score calculé (G*F*P)")
    level: RiskLevel = Field(..., description="Niveau de risque")
    
    @property
    def normalized_score(self) -> int:
        """Score normalisé sur 100"""
        return int(round(self.score / 125 * 100))


class RiskItem(BaseModel):
    """Un risque dans le projet d'analyse"""
    id: str = Field(..., description="ID unique du risque")
    description: str = Field(..., min_length=10, description="Description du risque")
    category: RiskCategory = Field(..., description="Catégorie du risque")
    type: RiskType = Field(..., description="Type de risque")
    
    # Évaluation initiale
    initial_evaluation: RiskEvaluation = Field(..., description="Évaluation avant mesures")
    
    # Solution de contournement / mesure (optionnel au début)
    mitigation_measure: str = Field(default="", description="Solution de contournement proposée")
    
    # Évaluation après mesure (optionnel au début)
    residual_evaluation: Optional[RiskEvaluation] = Field(None, description="Évaluation après mesures")
    
    # Métadonnées
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class AnalysisProject(BaseModel):
    """Projet d'analyse de risques complet"""
    id: str = Field(..., description="ID unique du projet")
    
    # Initialisation
    project_type: Literal["project", "entity"] = Field(..., description="Type: projet ou entité")
    project_description: str = Field(..., min_length=10, description="Description du projet/entité")
    entity_type: Optional[EntityType] = Field(None, description="Type d'entité (si applicable)")
    entity_services: Optional[str] = Field(None, description="Services et produits de l'entité")
    
    # Titre du projet d'analyse
    analysis_title: str = Field(..., min_length=5, description="Titre du projet d'analyse")
    
    # Secteur d'activité
    sector: Optional[str] = Field(None, description="Secteur d'activité")
    
    # Risques (peut être vide au début, minimum 4 pour compléter)
    risks: List[RiskItem] = Field(default_factory=list, description="Liste des risques")
    
    # Métadonnées
    user_uid: str = Field(..., description="UID de l'utilisateur propriétaire")
    user_email: Optional[str] = Field(None, description="Email de l'utilisateur")
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    status: Literal["draft", "completed"] = Field(default="draft", description="Statut du projet")


class CreateProjectRequest(BaseModel):
    """Requête de création de projet"""
    project_type: Literal["project", "entity"]
    project_description: str = Field(..., min_length=10)
    entity_type: Optional[EntityType] = None
    entity_services: Optional[str] = None
    analysis_title: str = Field(..., min_length=5)
    sector: Optional[str] = None


class AddRiskRequest(BaseModel):
    """Requête d'ajout de risque au projet"""
    project_id: str
    description: str = Field(..., min_length=10)
    category: RiskCategory
    type: RiskType
    G: int = Field(..., ge=1, le=5)
    F: int = Field(..., ge=1, le=5)
    P: int = Field(..., ge=1, le=5)


class UpdateRiskMitigationRequest(BaseModel):
    """Requête de mise à jour de la mesure et évaluation résiduelle"""
    project_id: str
    risk_id: str
    mitigation_measure: str = Field(..., min_length=10)
    residual_G: int = Field(..., ge=1, le=5)
    residual_F: int = Field(..., ge=1, le=5)
    residual_P: int = Field(..., ge=1, le=5)


class ProjectListResponse(BaseModel):
    """Réponse de liste de projets"""
    total: int
    limit: int
    offset: int
    projects: List[AnalysisProject]


class ProjectSummary(BaseModel):
    """Résumé d'un projet pour la liste"""
    id: str
    analysis_title: str
    project_type: Literal["project", "entity"]
    entity_type: Optional[EntityType]
    sector: Optional[str]
    risks_count: int
    completed_risks_count: int
    status: Literal["draft", "completed"]
    created_at: str
    updated_at: str


class ProjectSummaryListResponse(BaseModel):
    """Réponse de liste de résumés de projets"""
    total: int
    limit: int
    offset: int
    projects: List[ProjectSummary]


class UpdateProjectRequest(BaseModel):
    """Requête de mise à jour d'un projet"""
    analysis_title: Optional[str] = Field(None, min_length=5)
    project_description: Optional[str] = Field(None, min_length=10)
    entity_type: Optional[EntityType] = None
    entity_services: Optional[str] = None
    sector: Optional[str] = None


class DuplicateProjectRequest(BaseModel):
    """Requête de duplication de projet"""
    new_title: Optional[str] = Field(None, description="Nouveau titre (optionnel, sinon ajoute _v2)")


class IAAnalysisItem(BaseModel):
    """Analyse IA d'un risque"""
    G: int
    F: int
    P: int
    score: int
    classification: str
    causes: Optional[List[str]] = None
    recommendations: Optional[List[str]] = None
    justification: Optional[str] = None


class ComparisonResult(BaseModel):
    """Résultat de comparaison Humain vs IA"""
    agreement_level: str = Field(..., description="Élevé, Moyen, Faible")
    classifications_match: bool
    score_difference: int
    analysis: Optional[str] = None


class RiskComparison(BaseModel):
    """Comparaison Humain vs IA pour un risque"""
    risk_id: str
    risk_description: str
    human_analysis: IAAnalysisItem
    ia_analysis: IAAnalysisItem
    comparison: ComparisonResult


class ProjectIAAnalysisResponse(BaseModel):
    """Réponse de l'analyse IA d'un projet"""
    project_id: str
    comparisons: List[RiskComparison]
