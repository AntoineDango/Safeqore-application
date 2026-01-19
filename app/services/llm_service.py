import os
import time
import json
from typing import Optional, Dict

# LangChain Groq wrapper
from langchain_groq import ChatGroq

GROQ_KEY = os.getenv("GROQ_API_KEY")
# modèle par défaut (choisi selon ton compte Groq)
DEFAULT_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

def get_llm():
    if not GROQ_KEY:
        raise RuntimeError("GROQ_API_KEY not set in environment")
    return ChatGroq(api_key=GROQ_KEY, model_name=DEFAULT_MODEL, temperature=float(os.getenv("GROQ_TEMPERATURE", "0.15")))

def call_llm_for_risk(description: str, category: str, typ: str, sector: str, retries=2, wait=1) -> Optional[Dict]:
    """
    Appelle le LLM et retourne un dict ou None.
    Tentatives simples + nettoyage de la réponse JSON.
    """
    llm = get_llm()
    prompt = f"""
Tu es un expert en gestion des risques utilisant la méthode Kinney. Analyse le risque ci-dessous de manière approfondie.

## Risque à analyser
- Description: {description}
- Catégorie: {category}
- Type: {typ}
- Secteur: {sector}

## Échelles Kinney
- Gravité (G): 1=Négligeable, 2=Faible, 3=Modérée, 4=Grave, 5=Catastrophique
- Fréquence (F): 1=Rare, 2=Occasionnel, 3=Fréquent, 4=Très fréquent, 5=Permanent
- Probabilité (P): 1=Improbable, 2=Peu probable, 3=Probable, 4=Très probable, 5=Quasi certain

## Classification (Score = G × F × P)
- Faible: 1-25 → Mesures à long terme
- Moyen: 26-50 → Mesures à court/moyen terme
- Eleve: 51-125 → Mesures immédiates requises

## Instructions
Fournis une analyse DÉTAILLÉE incluant:
1. Les valeurs G, F, P justifiées
2. Les CAUSES RACINES identifiées (minimum 2-3 causes)
3. Des RECOMMANDATIONS DÉTAILLÉES et actionnables (minimum 3-4 recommandations)

Répond STRICTEMENT en JSON (rien d'autre) avec ce format exact:
{{
  "G": 4,
  "F": 3,
  "P": 2,
  "llm_classification": "Moyen",
  "causes": [
    "Cause 1: description détaillée de la cause racine",
    "Cause 2: description détaillée de la cause racine",
    "Cause 3: description détaillée de la cause racine"
  ],
  "recommendations": [
    "Recommandation 1: action concrète et mesurable",
    "Recommandation 2: action concrète et mesurable",
    "Recommandation 3: action concrète et mesurable",
    "Recommandation 4: action concrète et mesurable"
  ],
  "justification": "Explication brève du choix des valeurs G, F, P"
}}
"""
    text = ""
    for attempt in range(retries + 1):
        try:
            res = llm.invoke(prompt)
            text = res.content.strip()
            # nettoyage simple : extraire premier JSON trouvé
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1 and end != -1:
                payload = text[start:end]
                return json.loads(payload)
            # fallback brut
            return json.loads(text)
        except Exception as exc:
            # log minimal pour debug
            print(f"Erreur LLM: attempt={attempt} err={exc}")
            if attempt < retries:
                time.sleep(wait * (attempt + 1))
                continue
            return None
