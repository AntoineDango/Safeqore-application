"""
Service d'enrichissement automatique du modèle SafeQore.
Permet d'ajouter de nouvelles données et de ré-entraîner le modèle.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from typing import List, Dict, Optional
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import threading
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TRAINING_DATA_DIR = os.path.join(BASE_DIR, 'training', 'data')
FEEDBACK_FILE = os.path.join(TRAINING_DATA_DIR, 'feedback_data.json')
MODEL_PATH = os.path.join(BASE_DIR, 'risk_classifier.pkl')
ENCODERS_PATH = os.path.join(BASE_DIR, 'encoders.pkl')
CLASS_ENCODER_PATH = os.path.join(BASE_DIR, 'classification_encoder.pkl')

# Lock pour éviter les ré-entraînements simultanés
_training_lock = threading.Lock()
_is_training = False


def classify_from_score(score: int) -> str:
    """Classification selon la méthode KINNEY."""
    if score <= 25:
        return "Faible"
    elif score <= 50:
        return "Moyen"
    return "Eleve"


def ensure_directories():
    """Crée les répertoires nécessaires s'ils n'existent pas."""
    os.makedirs(TRAINING_DATA_DIR, exist_ok=True)


def load_feedback_data() -> List[Dict]:
    """Charge les données de feedback existantes."""
    ensure_directories()
    if os.path.exists(FEEDBACK_FILE):
        try:
            with open(FEEDBACK_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return []
    return []


def save_feedback_data(data: List[Dict]):
    """Sauvegarde les données de feedback."""
    ensure_directories()
    with open(FEEDBACK_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def add_feedback(
    description: str,
    category: str,
    risk_type: str,
    G: int,
    F: int,
    P: int,
    user_classification: Optional[str] = None,
    sector: str = "",
    mitigation: str = ""
) -> Dict:
    """
    Ajoute un feedback utilisateur pour enrichir le modèle.

    Args:
        description: Description du risque
        category: Catégorie (Projet/Programme, Industriel, Qualité)
        risk_type: Type (Commercial, Financier, Technique, Cyber & SSI)
        G: Gravité (1-5)
        F: Fréquence (1-5)
        P: Probabilité (1-5)
        user_classification: Classification corrigée par l'utilisateur (optionnel)
        sector: Secteur d'activité
        mitigation: Mesure de contournement proposée

    Returns:
        Dict avec les informations du feedback ajouté
    """
    # Valider les valeurs
    G = max(1, min(5, int(G)))
    F = max(1, min(5, int(F)))
    P = max(1, min(5, int(P)))

    score = G * F * P
    computed_classification = classify_from_score(score)

    feedback_entry = {
        "id": f"FB_{datetime.now().strftime('%Y%m%d%H%M%S')}_{len(load_feedback_data())}",
        "timestamp": datetime.now().isoformat(),
        "description": description,
        "category": category,
        "type": risk_type,
        "sector": sector,
        "G": G,
        "F": F,
        "P": P,
        "score": score,
        "computed_classification": computed_classification,
        "user_classification": user_classification or computed_classification,
        "mitigation": mitigation,
        "used_for_training": False
    }

    # Charger, ajouter et sauvegarder
    data = load_feedback_data()
    data.append(feedback_entry)
    save_feedback_data(data)

    logger.info(f"Feedback ajouté: {feedback_entry['id']}")
    return feedback_entry


def get_feedback_stats() -> Dict:
    """
    Retourne des statistiques sur les données de feedback.
    """
    data = load_feedback_data()

    if not data:
        return {
            "total_feedbacks": 0,
            "used_for_training": 0,
            "pending_training": 0,
            "by_category": {},
            "by_type": {},
            "by_classification": {}
        }

    df = pd.DataFrame(data)

    return {
        "total_feedbacks": len(data),
        "used_for_training": len([d for d in data if d.get("used_for_training", False)]),
        "pending_training": len([d for d in data if not d.get("used_for_training", False)]),
        "by_category": df['category'].value_counts().to_dict(),
        "by_type": df['type'].value_counts().to_dict(),
        "by_classification": df['user_classification'].value_counts().to_dict()
    }


def load_scenarios_data() -> pd.DataFrame:
    """
    Charge les scénarios prédéfinis depuis le fichier JSON.
    """
    scenarios_file = os.path.join(TRAINING_DATA_DIR, 'risk_scenarios.json')
    if not os.path.exists(scenarios_file):
        return pd.DataFrame()

    with open(scenarios_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    scenarios = data.get('scenarios', [])
    if not scenarios:
        return pd.DataFrame()

    df = pd.DataFrame(scenarios)
    df['score'] = df['G'] * df['F'] * df['P']
    df['classification'] = df['score'].apply(classify_from_score)

    return df


def prepare_training_data() -> pd.DataFrame:
    """
    Prépare les données d'entraînement en combinant:
    - Scénarios prédéfinis
    - Données de feedback utilisateur
    - Données synthétiques générées
    """
    all_data = []

    # 1. Charger les scénarios prédéfinis
    scenarios_df = load_scenarios_data()
    if not scenarios_df.empty:
        scenarios_df = scenarios_df[['G', 'F', 'P', 'category', 'type', 'score', 'classification']]
        # Multiplier les scénarios pour plus de poids
        for _ in range(20):
            all_data.append(scenarios_df.copy())

    # 2. Charger les données de feedback
    feedback = load_feedback_data()
    if feedback:
        feedback_df = pd.DataFrame(feedback)
        feedback_df = feedback_df.rename(columns={'user_classification': 'classification'})
        feedback_df = feedback_df[['G', 'F', 'P', 'category', 'type', 'score', 'classification']]
        # Les feedbacks ont un poids important
        for _ in range(50):
            all_data.append(feedback_df.copy())

    # 3. Générer des données synthétiques
    synthetic_df = generate_synthetic_data(2000)
    all_data.append(synthetic_df)

    # Combiner toutes les données
    if all_data:
        combined = pd.concat(all_data, ignore_index=True)
        return combined

    return pd.DataFrame()


def generate_synthetic_data(n_samples: int = 2000) -> pd.DataFrame:
    """
    Génère des données synthétiques pour l'entraînement.
    """
    import random

    categories = ["Projet/Programme", "Industriel", "Qualité"]
    types = ["Commercial", "Financier", "Technique", "Cyber & SSI"]

    data = []
    for _ in range(n_samples):
        G = random.randint(1, 5)
        F = random.randint(1, 5)
        P = random.randint(1, 5)
        score = G * F * P
        classification = classify_from_score(score)

        data.append({
            "G": G,
            "F": F,
            "P": P,
            "category": random.choice(categories),
            "type": random.choice(types),
            "score": score,
            "classification": classification
        })

    return pd.DataFrame(data)


def retrain_model(force: bool = False) -> Dict:
    """
    Ré-entraîne le modèle avec les nouvelles données.

    Args:
        force: Si True, force le ré-entraînement même si peu de nouvelles données

    Returns:
        Dict avec les résultats du ré-entraînement
    """
    global _is_training

    if _is_training and not force:
        return {
            "success": False,
            "message": "Un entraînement est déjà en cours",
            "status": "busy"
        }

    with _training_lock:
        _is_training = True
        try:
            logger.info("Démarrage du ré-entraînement du modèle...")

            # Préparer les données
            df = prepare_training_data()
            if df.empty or len(df) < 100:
                return {
                    "success": False,
                    "message": "Pas assez de données pour l'entraînement",
                    "data_count": len(df) if not df.empty else 0
                }

            # Encoder les variables catégorielles
            cat_encoder = LabelEncoder()
            type_encoder = LabelEncoder()
            class_encoder = LabelEncoder()

            df['category_encoded'] = cat_encoder.fit_transform(df['category'])
            df['type_encoded'] = type_encoder.fit_transform(df['type'])
            df['classification_encoded'] = class_encoder.fit_transform(df['classification'])

            # Features et target
            X = df[['G', 'F', 'P', 'category_encoded', 'type_encoded']].values
            y = df['classification_encoded'].values

            # Split
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )

            # Entraîner le modèle
            model = RandomForestClassifier(
                n_estimators=200,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                class_weight='balanced',
                random_state=42,
                n_jobs=-1
            )
            model.fit(X_train, y_train)

            # Évaluer
            train_score = model.score(X_train, y_train)
            test_score = model.score(X_test, y_test)

            # Sauvegarder
            joblib.dump(model, MODEL_PATH)
            joblib.dump({'category': cat_encoder, 'type': type_encoder}, ENCODERS_PATH)
            joblib.dump(class_encoder, CLASS_ENCODER_PATH)

            # Marquer les feedbacks comme utilisés
            feedback = load_feedback_data()
            for entry in feedback:
                entry['used_for_training'] = True
            save_feedback_data(feedback)

            result = {
                "success": True,
                "message": "Modèle ré-entraîné avec succès",
                "timestamp": datetime.now().isoformat(),
                "metrics": {
                    "train_accuracy": round(train_score, 4),
                    "test_accuracy": round(test_score, 4),
                    "training_samples": len(X_train),
                    "test_samples": len(X_test),
                    "total_samples": len(df)
                },
                "classes": list(class_encoder.classes_)
            }

            logger.info(f"Ré-entraînement terminé: {result}")
            return result

        except Exception as e:
            logger.error(f"Erreur lors du ré-entraînement: {e}")
            return {
                "success": False,
                "message": f"Erreur: {str(e)}",
                "status": "error"
            }
        finally:
            _is_training = False


def auto_enrich_from_llm_responses(
    llm_response: Dict,
    user_validated: bool = False
) -> Optional[Dict]:
    """
    Enrichit automatiquement le modèle à partir des réponses LLM validées.

    Cette fonction est appelée après chaque analyse réussie pour collecter
    des données d'entraînement automatiquement.

    Args:
        llm_response: Réponse du LLM avec G, F, P, classification
        user_validated: Si l'utilisateur a validé cette réponse

    Returns:
        Dict avec le feedback ajouté ou None
    """
    if not llm_response:
        return None

    try:
        return add_feedback(
            description=llm_response.get('description', ''),
            category=llm_response.get('category', 'Projet/Programme'),
            risk_type=llm_response.get('type', 'Technique'),
            G=llm_response.get('G', 3),
            F=llm_response.get('F', 3),
            P=llm_response.get('P', 3),
            user_classification=llm_response.get('classification') if user_validated else None,
            sector=llm_response.get('sector', ''),
            mitigation=llm_response.get('llm_recommendation', '')
        )
    except Exception as e:
        logger.error(f"Erreur lors de l'enrichissement automatique: {e}")
        return None


def get_training_status() -> Dict:
    """
    Retourne le statut actuel de l'entraînement et des données.
    """
    feedback_stats = get_feedback_stats()
    scenarios_df = load_scenarios_data()

    return {
        "is_training": _is_training,
        "feedback_data": feedback_stats,
        "scenarios_count": len(scenarios_df) if not scenarios_df.empty else 0,
        "model_exists": os.path.exists(MODEL_PATH),
        "last_modified": datetime.fromtimestamp(
            os.path.getmtime(MODEL_PATH)
        ).isoformat() if os.path.exists(MODEL_PATH) else None
    }
