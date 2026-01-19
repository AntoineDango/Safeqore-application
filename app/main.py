from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from pydantic import BaseModel, Field
from starlette.responses import FileResponse
import os

# Import des nouveaux routers
from app.routers.ia_router import router as ia_router
from app.routers.user_router import router as user_router
from app.routers.compare_router import router as compare_router
from app.routers.admin_router import router as admin_router
from app.routers.questionnaire_router import router as questionnaire_router
from app.constants import RISK_CATEGORIES, RISK_TYPES, SECTORS, RISK_CLASSES
from app.auth.dependencies import get_current_user
from app.firebase_admin_init import initialize_firebase
from app.auth.dependencies import get_current_user_optional


app = FastAPI(
    title="SafeQore API",
    description="""
## API d'analyse des risques - Méthode KINNEY

SafeQore permet d'analyser les risques selon la méthodologie Kinney avec :

### 🤖 Analyse IA (`/ia/analyze`)
L'IA analyse automatiquement votre description de risque et évalue G, F, P.


### ⚖️ Comparaison (`/compare`)
Comparez votre évaluation avec celle de l'IA pour calibrer vos analyses.

### 📊 Méthodologie Kinney
- **G** (Gravité) : 1-5
- **F** (Fréquence) : 1-5
- **P** (Probabilité) : 1-5
- **Score** = G × F × P (max: 125)

### Classification
| Score | Classification | Action |
|-------|---------------|--------|
| 1-25 | Faible | Mesures à long terme |
| 26-50 | Modéré | Mesures à court/moyen terme |
| 51-125 | Élevé | Mesures immédiates |
""",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase Admin (once)
try:
    initialize_firebase()
except Exception:
    # Do not crash if creds not provided; token verification will fail at use time
    pass

# Enregistrement des routers
app.include_router(ia_router)
app.include_router(user_router)
app.include_router(compare_router)
app.include_router(admin_router)
app.include_router(questionnaire_router)


# Modèles pour les endpoints racine
class ConstantsResponse(BaseModel):
    """Constantes STB disponibles."""
    categories: List[str] = Field(..., description="Catégories de risques (STB_AR_0002)")
    types: List[str] = Field(..., description="Types de risques (STB_AR_0003)")
    sectors: List[str] = Field(..., description="Secteurs d'activité")
    classifications: List[str] = Field(..., description="Niveaux de classification")
    kinney_thresholds: dict = Field(..., description="Seuils de classification Kinney")


@app.get("/", tags=["Info"])
async def root(request: Request):
    """
    Si Accept JSON → retourne les informations API.
    Sinon, si le build web (SPA) existe → sert index.html.
    À défaut, retourne les informations API.
    """
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    accept = request.headers.get("accept", "")
    ua = request.headers.get("user-agent", "").lower()
    wants_json = ("application/json" in accept) or ("+json" in accept) or ("testclient" in ua)
    if wants_json or not os.path.isfile(index_path):
        return {
        "name": "SafeQore API",
        "version": "2.0.0",
        "description": "Solution d'analyse des risques assistée par IA - Méthode KINNEY",
        "endpoints": {
            "ia_analyze": {"path": "/ia/analyze", "method": "POST"},
            "user_analyze": {"path": "/user/analyze", "method": "POST"},
            
            "user_analyses": {"path": "/user/analyses", "method": "GET"},
            "compare": {"path": "/compare", "method": "POST"},
            "constants": {"path": "/constants", "method": "GET"},
            "admin_status": {"path": "/admin/status", "method": "GET"},
            "docs": {"path": "/docs", "method": "GET"},
        },
    }

    # Serve SPA if present and client does not request JSON
    return FileResponse(index_path)


@app.get("/health", tags=["Info"])
async def health_check():
    """Vérification de l'état de l'API."""
    return {"status": "healthy"}


@app.get("/constants", response_model=ConstantsResponse, tags=["Info"])
async def get_constants():
    """
    Retourne les constantes définies dans les spécifications STB.

    Utile pour :
    - Alimenter les formulaires frontend
    - Valider les entrées utilisateur
    - Comprendre les valeurs acceptées
    """
    return ConstantsResponse(
        categories=RISK_CATEGORIES,
        types=RISK_TYPES,
        sectors=SECTORS,
        classifications=["Faible", "Modéré", "Élevé"],
        kinney_thresholds={
            "Faible": {"min": 1, "max": 25, "action": "Mesures à long terme"},
            "Modéré": {"min": 26, "max": 50, "action": "Mesures à court/moyen terme"},
            "Élevé": {"min": 51, "max": 125, "action": "Mesures immédiates"}
        }
    )


# --- Single-server frontend (Expo Web build) ---
# We serve the static web build (generated by `expo export --platform web`) from FastAPI.
# This avoids running a separate web server; open http://localhost:4000 to use the app.

FRONTEND_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "safeqore_mobile", "safeqore-app", "dist")
)

API_PREFIXES = (
    "docs",
    "redoc",
    "openapi.json",
    "health",
    "constants",
    "ia",
    "user",
    "compare",
    "questionnaire",
    "admin",
)
@app.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    """
    Récupérer le profil de l'utilisateur connecté
    """
    return {
        "profile": {
            "uid": current_user["uid"],
            "email": current_user["email"],
            "email_verified": current_user["decoded_token"].get("email_verified", False),
            "name": current_user["decoded_token"].get("name"),
            "picture": current_user["decoded_token"].get("picture")
        }
    }


@app.post("/users/create")
async def create_user_data(
    user_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Exemple de création de données utilisateur
    """
    # Ici vous pouvez sauvegarder dans votre base de données
    return {
        "message": "Données utilisateur créées",
        "user_id": current_user["uid"],
        "data": user_data
    }



@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """
    Catch-all handler to serve the built SPA and its assets without shadowing API routes.
    - If the path matches API prefixes, return 404 to allow API routes to handle it.
    - If a static asset exists at the path, serve it.
    - Otherwise, serve index.html (SPA fallback) if build exists.
    """
    # Let API endpoints handle their routes
    for p in API_PREFIXES:
        if full_path == p or full_path.startswith(p + "/"):
            raise HTTPException(status_code=404)

    # If no frontend build, return 404
    if not os.path.isdir(FRONTEND_DIR):
        raise HTTPException(status_code=404)

    requested_path = os.path.join(FRONTEND_DIR, full_path)
    if os.path.isfile(requested_path):
        return FileResponse(requested_path)

    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)

    raise HTTPException(status_code=404)
