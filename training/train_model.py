"""
Script d'entraînement du modèle ML SafeQore
Génère des données synthétiques et entraîne le classifieur de risques
"""

import os
import sys
import json
import random
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
import warnings
warnings.filterwarnings('ignore')

# Ajouter le chemin parent pour importer les constantes
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.constants import RISK_CATEGORIES, RISK_TYPES, KINNEY_SCALE, SECTORS

# Configuration
OUTPUT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')


def classify_from_score(score: int) -> str:
    """Classification selon la méthode KINNEY - STB_AR_0006"""
    if score <= 25:
        return "Faible"
    elif score <= 50:
        return "Moyen"
    return "Eleve"


def generate_synthetic_training_data(n_samples: int = 5000) -> pd.DataFrame:
    """
    Génère des données d'entraînement synthétiques basées sur les spécifications STB.

    Les données sont générées avec des distributions réalistes pour chaque
    combinaison catégorie/type de risque.
    """
    data = []

    # Profils de risque par type (probabilités de G, F, P élevés)
    risk_profiles = {
        "Commercial": {"G_bias": 0.4, "F_bias": 0.5, "P_bias": 0.4},
        "Financier": {"G_bias": 0.6, "F_bias": 0.3, "P_bias": 0.5},
        "Technique": {"G_bias": 0.5, "F_bias": 0.6, "P_bias": 0.4},
        "Cyber & SSI": {"G_bias": 0.7, "F_bias": 0.5, "P_bias": 0.6}
    }

    # Modificateurs par catégorie
    category_modifiers = {
        "Projet/Programme": {"G_mod": 0.0, "F_mod": 0.1, "P_mod": 0.0},
        "Industriel": {"G_mod": 0.2, "F_mod": 0.1, "P_mod": 0.1},
        "Qualité": {"G_mod": -0.1, "F_mod": 0.2, "P_mod": 0.0}
    }

    for _ in range(n_samples):
        category = random.choice(RISK_CATEGORIES)
        risk_type = random.choice(RISK_TYPES)
        sector = random.choice(SECTORS)

        # Obtenir le profil de risque
        profile = risk_profiles[risk_type]
        cat_mod = category_modifiers[category]

        # Calculer les probabilités ajustées
        g_prob = min(max(profile["G_bias"] + cat_mod["G_mod"], 0.1), 0.9)
        f_prob = min(max(profile["F_bias"] + cat_mod["F_mod"], 0.1), 0.9)
        p_prob = min(max(profile["P_bias"] + cat_mod["P_mod"], 0.1), 0.9)

        # Générer G, F, P avec distribution pondérée (1-5)
        G = generate_weighted_value(g_prob)
        F = generate_weighted_value(f_prob)
        P = generate_weighted_value(p_prob)

        # Calculer le score et la classification
        score = G * F * P
        classification = classify_from_score(score)

        data.append({
            "G": G,
            "F": F,
            "P": P,
            "category": category,
            "type": risk_type,
            "sector": sector,
            "score": score,
            "classification": classification
        })

    return pd.DataFrame(data)


def generate_weighted_value(high_prob: float) -> int:
    """
    Génère une valeur entre 1 et 5 avec une probabilité pondérée.
    high_prob : probabilité d'obtenir des valeurs élevées (4-5)
    """
    if random.random() < high_prob:
        return random.choices([4, 5], weights=[0.6, 0.4])[0]
    else:
        return random.choices([1, 2, 3], weights=[0.3, 0.4, 0.3])[0]


def generate_realistic_scenarios() -> pd.DataFrame:
    """
    Génère des scénarios réalistes basés sur des cas d'usage typiques.
    Ces données enrichissent le modèle avec des patterns métier réels.
    """
    scenarios = []

    # Scénarios Commercial
    commercial_scenarios = [
        {"G": 3, "F": 4, "P": 3, "category": "Projet/Programme", "type": "Commercial",
         "desc": "Perte d'un client majeur"},
        {"G": 4, "F": 3, "P": 4, "category": "Projet/Programme", "type": "Commercial",
         "desc": "Échec de négociation contractuelle"},
        {"G": 2, "F": 5, "P": 2, "category": "Qualité", "type": "Commercial",
         "desc": "Réclamations clients récurrentes"},
        {"G": 5, "F": 2, "P": 3, "category": "Industriel", "type": "Commercial",
         "desc": "Rupture de partenariat stratégique"},
    ]

    # Scénarios Financier
    financial_scenarios = [
        {"G": 5, "F": 2, "P": 4, "category": "Projet/Programme", "type": "Financier",
         "desc": "Dépassement budgétaire majeur"},
        {"G": 4, "F": 4, "P": 3, "category": "Industriel", "type": "Financier",
         "desc": "Fluctuation des coûts matières premières"},
        {"G": 3, "F": 3, "P": 4, "category": "Qualité", "type": "Financier",
         "desc": "Pénalités de retard"},
        {"G": 5, "F": 1, "P": 5, "category": "Projet/Programme", "type": "Financier",
         "desc": "Faillite d'un fournisseur clé"},
    ]

    # Scénarios Technique
    technical_scenarios = [
        {"G": 4, "F": 4, "P": 3, "category": "Industriel", "type": "Technique",
         "desc": "Panne équipement critique"},
        {"G": 3, "F": 5, "P": 4, "category": "Qualité", "type": "Technique",
         "desc": "Non-conformité produit"},
        {"G": 5, "F": 3, "P": 4, "category": "Projet/Programme", "type": "Technique",
         "desc": "Obsolescence technologique"},
        {"G": 4, "F": 3, "P": 3, "category": "Industriel", "type": "Technique",
         "desc": "Défaillance système de production"},
    ]

    # Scénarios Cyber & SSI
    cyber_scenarios = [
        {"G": 5, "F": 4, "P": 4, "category": "Projet/Programme", "type": "Cyber & SSI",
         "desc": "Attaque ransomware"},
        {"G": 5, "F": 3, "P": 5, "category": "Industriel", "type": "Cyber & SSI",
         "desc": "Fuite de données sensibles"},
        {"G": 4, "F": 5, "P": 3, "category": "Qualité", "type": "Cyber & SSI",
         "desc": "Phishing ciblé"},
        {"G": 5, "F": 2, "P": 4, "category": "Industriel", "type": "Cyber & SSI",
         "desc": "Compromission infrastructure critique"},
    ]

    all_scenarios = (commercial_scenarios + financial_scenarios +
                     technical_scenarios + cyber_scenarios)

    for scenario in all_scenarios:
        score = scenario["G"] * scenario["F"] * scenario["P"]
        scenario["score"] = score
        scenario["classification"] = classify_from_score(score)
        scenario["sector"] = random.choice(SECTORS)
        scenarios.append(scenario)

    # Multiplier les scénarios pour plus de poids
    multiplied = []
    for scenario in scenarios:
        for _ in range(50):  # Chaque scénario réel compte comme 50 exemples
            variant = scenario.copy()
            # Légères variations
            variant["G"] = max(1, min(5, variant["G"] + random.choice([-1, 0, 0, 0, 1])))
            variant["F"] = max(1, min(5, variant["F"] + random.choice([-1, 0, 0, 0, 1])))
            variant["P"] = max(1, min(5, variant["P"] + random.choice([-1, 0, 0, 0, 1])))
            variant["score"] = variant["G"] * variant["F"] * variant["P"]
            variant["classification"] = classify_from_score(variant["score"])
            multiplied.append(variant)

    return pd.DataFrame(multiplied)


def train_model(df: pd.DataFrame, model_type: str = "random_forest"):
    """
    Entraîne le modèle de classification des risques.
    """
    print(f"\n{'='*60}")
    print(f"Entraînement du modèle: {model_type}")
    print(f"{'='*60}")

    # Encodage des variables catégorielles
    cat_encoder = LabelEncoder()
    type_encoder = LabelEncoder()
    class_encoder = LabelEncoder()

    df['category_encoded'] = cat_encoder.fit_transform(df['category'])
    df['type_encoded'] = type_encoder.fit_transform(df['type'])
    df['classification_encoded'] = class_encoder.fit_transform(df['classification'])

    # Features et target
    X = df[['G', 'F', 'P', 'category_encoded', 'type_encoded']].values
    y = df['classification_encoded'].values

    # Split train/test
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Sélection du modèle
    if model_type == "random_forest":
        model = RandomForestClassifier(
            n_estimators=200,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            class_weight='balanced',
            random_state=42,
            n_jobs=-1
        )
    elif model_type == "gradient_boosting":
        model = GradientBoostingClassifier(
            n_estimators=150,
            max_depth=10,
            learning_rate=0.1,
            random_state=42
        )
    else:
        raise ValueError(f"Type de modèle non supporté: {model_type}")

    # Entraînement
    print("\nEntraînement en cours...")
    model.fit(X_train, y_train)

    # Évaluation
    y_pred = model.predict(X_test)

    print("\n📊 Rapport de classification:")
    print(classification_report(y_test, y_pred,
                               target_names=class_encoder.classes_))

    print("\n📈 Matrice de confusion:")
    cm = confusion_matrix(y_test, y_pred)
    print(pd.DataFrame(cm,
                      index=class_encoder.classes_,
                      columns=class_encoder.classes_))

    # Cross-validation
    cv_scores = cross_val_score(model, X, y, cv=5)
    print(f"\n🎯 Score de validation croisée: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")

    # Importance des features
    if hasattr(model, 'feature_importances_'):
        print("\n🔍 Importance des features:")
        features = ['G', 'F', 'P', 'category', 'type']
        for feat, imp in zip(features, model.feature_importances_):
            print(f"  {feat}: {imp:.4f}")

    return model, cat_encoder, type_encoder, class_encoder


def save_model(model, cat_encoder, type_encoder, class_encoder,
               output_dir: str = None):
    """
    Sauvegarde le modèle et les encodeurs.
    """
    if output_dir is None:
        output_dir = OUTPUT_DIR

    # Sauvegarder le modèle
    model_path = os.path.join(output_dir, 'risk_classifier.pkl')
    joblib.dump(model, model_path)
    print(f"\n✅ Modèle sauvegardé: {model_path}")

    # Sauvegarder les encodeurs
    encoders = {
        'category': cat_encoder,
        'type': type_encoder
    }
    encoders_path = os.path.join(output_dir, 'encoders.pkl')
    joblib.dump(encoders, encoders_path)
    print(f"✅ Encodeurs sauvegardés: {encoders_path}")

    # Sauvegarder l'encodeur de classification
    class_encoder_path = os.path.join(output_dir, 'classification_encoder.pkl')
    joblib.dump(class_encoder, class_encoder_path)
    print(f"✅ Encodeur de classification sauvegardé: {class_encoder_path}")


def save_training_data(df: pd.DataFrame, filename: str = "training_data.csv"):
    """
    Sauvegarde les données d'entraînement pour référence.
    """
    os.makedirs(DATA_DIR, exist_ok=True)
    filepath = os.path.join(DATA_DIR, filename)
    df.to_csv(filepath, index=False)
    print(f"✅ Données d'entraînement sauvegardées: {filepath}")


def main():
    """
    Point d'entrée principal pour l'entraînement du modèle.
    """
    print("🚀 SafeQore - Entraînement du modèle ML")
    print(f"📅 Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Génération des données
    print("\n📦 Génération des données synthétiques...")
    synthetic_data = generate_synthetic_training_data(n_samples=5000)
    print(f"  - Données synthétiques: {len(synthetic_data)} échantillons")

    print("\n📦 Génération des scénarios réalistes...")
    realistic_data = generate_realistic_scenarios()
    print(f"  - Scénarios réalistes: {len(realistic_data)} échantillons")

    # Combiner les données
    full_data = pd.concat([synthetic_data, realistic_data], ignore_index=True)
    print(f"\n📊 Total des données d'entraînement: {len(full_data)} échantillons")

    # Distribution des classes
    print("\n📈 Distribution des classes:")
    print(full_data['classification'].value_counts())

    # Sauvegarder les données d'entraînement
    save_training_data(full_data)

    # Entraîner le modèle
    model, cat_enc, type_enc, class_enc = train_model(
        full_data,
        model_type="random_forest"
    )

    # Sauvegarder le modèle
    save_model(model, cat_enc, type_enc, class_enc)

    print("\n✨ Entraînement terminé avec succès!")


if __name__ == "__main__":
    main()
