"""
Constantes pour SafeQore - Conformité STB
"""

# STB_AR_0002 - Catégories de risques
RISK_CATEGORIES = [
    "Projet/Programme",
    "Industriel",
    "Qualité"
]

# STB_AR_0003 - Types de risques
RISK_TYPES = [
    "Commercial",
    "Financier",
    "Technique",
    "Cyber & SSI"
]

# STB_AR_0004 - Classification des risques (méthode KINNEY)
# Score R = G x F x P (max = 5 x 5 x 5 = 125)
RISK_CLASSES = {
    "Faible": {"min": 0, "max": 25, "action": "Mesure à prendre à long terme"},
    "Moyen": {"min": 26, "max": 50, "action": "Attention requise, prendre des mesures à court et moyen terme"},
    "Eleve": {"min": 51, "max": 125, "action": "Prendre des mesures immédiates"}
}

# STB_AR_0005 - Échelle KINNEY pour les facteurs G, F, P
KINNEY_SCALE = {
    "G": {  # Gravité du dommage
        1: "Faible gravité",
        2: "Gravité légère",
        3: "Gravité moyenne",
        4: "Gravité importante",
        5: "Gravité très élevée"
    },
    "F": {  # Fréquence d'exposition
        1: "Faible exposition",
        2: "Exposition occasionnelle",
        3: "Exposition régulière",
        4: "Exposition fréquente",
        5: "Exposition très élevée"
    },
    "P": {  # Probabilité
        1: "Faible probabilité",
        2: "Probabilité légère",
        3: "Probabilité moyenne",
        4: "Probabilité importante",
        5: "Probabilité très élevée"
    }
}

# Secteurs cibles (MVP)
SECTORS = [
    "Mobilité et Transport",
    "Agriculture",
    "Technologie",
    "Innovation",
    "Startup",
    "TPE",
    "PME",
    "ETI"
]


def validate_category(category: str) -> bool:
    """Valide si la catégorie est conforme aux spécifications."""
    return category in RISK_CATEGORIES


def validate_type(risk_type: str) -> bool:
    """Valide si le type de risque est conforme aux spécifications."""
    return risk_type in RISK_TYPES


def get_risk_action(score: int) -> str:
    """Retourne l'action recommandée selon le score."""
    if score <= 25:
        return RISK_CLASSES["Faible"]["action"]
    elif score <= 50:
        return RISK_CLASSES["Moyen"]["action"]
    return RISK_CLASSES["Eleve"]["action"]
