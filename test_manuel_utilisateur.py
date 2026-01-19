#!/usr/bin/env python3
"""
Script interactif de test SafeQore API.

Permet aux utilisateurs de tester manuellement les endpoints de l'API
avec leurs propres données.

Usage:
    python test_manuel_utilisateur.py
"""

import json
import sys

try:
    import httpx
except ImportError:
    print("❌ Module 'httpx' non installé. Installez-le avec: pip install httpx")
    sys.exit(1)


# Configuration
API_BASE_URL = "http://localhost:4000"

# Constantes STB
CATEGORIES = ["Projet/Programme", "Industriel", "Qualité"]
TYPES = ["Commercial", "Financier", "Technique", "Cyber & SSI"]
SECTORS = [
    "Mobilité et Transport", "Agriculture", "Technologie",
    "Innovation", "Startup", "TPE", "PME", "ETI"
]
CLASSIFICATIONS = ["Faible", "Moyen", "Eleve"]


def print_header(title: str):
    """Affiche un en-tête formaté."""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_json(data: dict):
    """Affiche un JSON formaté."""
    print(json.dumps(data, indent=2, ensure_ascii=False))


def check_api_health() -> bool:
    """Vérifie que l'API est en ligne."""
    try:
        response = httpx.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ API SafeQore en ligne")
            return True
        else:
            print(f"❌ API répond avec le code: {response.status_code}")
            return False
    except httpx.ConnectError:
        print(f"❌ Impossible de se connecter à {API_BASE_URL}")
        print("   Vérifiez que le serveur est démarré avec:")
        print("   uvicorn app.main:app --reload --host 0.0.0.0 --port 4000")
        return False


def select_from_list(options: list, prompt: str) -> str:
    """Permet de sélectionner une option dans une liste."""
    print(f"\n{prompt}")
    for i, option in enumerate(options, 1):
        print(f"  {i}. {option}")

    while True:
        try:
            choice = input("\nVotre choix (numéro): ").strip()
            index = int(choice) - 1
            if 0 <= index < len(options):
                return options[index]
            print("❌ Numéro invalide, réessayez.")
        except ValueError:
            print("❌ Entrez un numéro valide.")


def get_kinney_value(factor: str) -> int:
    """Demande une valeur Kinney (1-5)."""
    descriptions = {
        "G": ["Faible gravité", "Gravité légère", "Gravité moyenne",
              "Gravité importante", "Gravité très élevée"],
        "F": ["Faible exposition", "Exposition occasionnelle", "Exposition régulière",
              "Exposition fréquente", "Exposition très élevée"],
        "P": ["Faible probabilité", "Probabilité légère", "Probabilité moyenne",
              "Probabilité importante", "Probabilité très élevée"]
    }

    print(f"\n📊 {factor} - Échelle Kinney:")
    for i, desc in enumerate(descriptions[factor], 1):
        print(f"  {i}. {desc}")

    while True:
        try:
            value = int(input(f"\nValeur pour {factor} (1-5): ").strip())
            if 1 <= value <= 5:
                return value
            print("❌ La valeur doit être entre 1 et 5.")
        except ValueError:
            print("❌ Entrez un nombre valide.")


def test_analyse_risque():
    """Test interactif de l'endpoint /hybrid-analyze."""
    print_header("ANALYSE DE RISQUE")

    print("\n📝 Décrivez le risque à analyser:")
    description = input("> ").strip()

    if not description:
        print("❌ La description ne peut pas être vide.")
        return

    category = select_from_list(CATEGORIES, "📁 Sélectionnez la catégorie:")
    risk_type = select_from_list(TYPES, "📋 Sélectionnez le type de risque:")

    print("\n🏢 Voulez-vous spécifier un secteur? (o/n)")
    if input("> ").strip().lower() == 'o':
        sector = select_from_list(SECTORS, "Sélectionnez le secteur:")
    else:
        sector = ""

    # Construire la requête
    request_data = {
        "description": description,
        "category": category,
        "type": risk_type,
        "sector": sector
    }

    print("\n📤 Envoi de la requête...")
    print_json(request_data)

    try:
        response = httpx.post(
            f"{API_BASE_URL}/hybrid-analyze",
            json=request_data,
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            print_header("RÉSULTAT DE L'ANALYSE")

            score = result.get("score", 0)
            classification = result.get("classification", "N/A")

            # Affichage coloré selon la classification
            if classification == "Eleve":
                emoji = "🔴"
            elif classification == "Moyen":
                emoji = "🟡"
            else:
                emoji = "🟢"

            print(f"\n{emoji} Classification: {classification}")
            print(f"📊 Score Kinney: {score}/125")
            print(f"\n   G (Gravité):    {result.get('G', 'N/A')}")
            print(f"   F (Fréquence):  {result.get('F', 'N/A')}")
            print(f"   P (Probabilité): {result.get('P', 'N/A')}")

            if result.get("ml_classification"):
                print(f"\n🤖 Classification ML: {result['ml_classification']}")

            if result.get("llm_recommendation"):
                print(f"\n💡 Recommandation:")
                print(f"   {result['llm_recommendation']}")

        else:
            print(f"\n❌ Erreur {response.status_code}:")
            print_json(response.json())

    except httpx.TimeoutException:
        print("❌ Timeout - L'API met trop de temps à répondre.")
    except Exception as e:
        print(f"❌ Erreur: {e}")


def test_feedback():
    """Test interactif de l'endpoint /enrichment/feedback."""
    print_header("SOUMETTRE UN FEEDBACK")

    print("\n📝 Décrivez le risque:")
    description = input("> ").strip()

    if not description:
        print("❌ La description ne peut pas être vide.")
        return

    category = select_from_list(CATEGORIES, "📁 Sélectionnez la catégorie:")
    risk_type = select_from_list(TYPES, "📋 Sélectionnez le type de risque:")

    print("\n📊 Entrez les valeurs Kinney (basées sur votre expertise):")
    G = get_kinney_value("G")
    F = get_kinney_value("F")
    P = get_kinney_value("P")

    score = G * F * P
    print(f"\n📈 Score calculé: {score} (G×F×P = {G}×{F}×{P})")

    # Classification calculée
    if score <= 25:
        computed_class = "Faible"
    elif score <= 50:
        computed_class = "Moyen"
    else:
        computed_class = "Eleve"
    print(f"   Classification calculée: {computed_class}")

    # Classification utilisateur (optionnelle)
    print("\n🔄 Voulez-vous corriger la classification? (o/n)")
    if input("> ").strip().lower() == 'o':
        user_classification = select_from_list(CLASSIFICATIONS, "Votre classification:")
    else:
        user_classification = None

    # Secteur (optionnel)
    print("\n🏢 Voulez-vous spécifier un secteur? (o/n)")
    if input("> ").strip().lower() == 'o':
        sector = select_from_list(SECTORS, "Sélectionnez le secteur:")
    else:
        sector = ""

    # Mitigation (optionnelle)
    print("\n🛡️ Mesure de mitigation (optionnel, appuyez sur Entrée pour ignorer):")
    mitigation = input("> ").strip()

    # Construire la requête
    request_data = {
        "description": description,
        "category": category,
        "type": risk_type,
        "G": G,
        "F": F,
        "P": P,
        "sector": sector,
        "mitigation": mitigation
    }

    if user_classification:
        request_data["user_classification"] = user_classification

    print("\n📤 Envoi du feedback...")

    try:
        response = httpx.post(
            f"{API_BASE_URL}/enrichment/feedback",
            json=request_data,
            timeout=10
        )

        if response.status_code == 200:
            result = response.json()
            print_header("FEEDBACK ENREGISTRÉ")
            print(f"\n✅ {result.get('message', 'Succès')}")
            print(f"   ID: {result.get('id', 'N/A')}")
            print(f"   Score: {result.get('score', 'N/A')}")
            print(f"   Classification calculée: {result.get('computed_classification', 'N/A')}")
            if user_classification:
                print(f"   Votre classification: {result.get('user_classification', 'N/A')}")
        else:
            print(f"\n❌ Erreur {response.status_code}:")
            print_json(response.json())

    except Exception as e:
        print(f"❌ Erreur: {e}")


def test_constantes():
    """Affiche les constantes STB."""
    print_header("CONSTANTES STB")

    try:
        response = httpx.get(f"{API_BASE_URL}/enrichment/constants", timeout=5)

        if response.status_code == 200:
            data = response.json()

            print("\n📁 Catégories de risques:")
            for cat in data.get("categories", []):
                print(f"   • {cat}")

            print("\n📋 Types de risques:")
            for t in data.get("types", []):
                print(f"   • {t}")

            print("\n🏢 Secteurs:")
            for s in data.get("sectors", []):
                print(f"   • {s}")

            print("\n📊 Méthodologie Kinney:")
            print("   Score = G × F × P (max: 125)")
            print("   • Faible: 0-25")
            print("   • Moyen: 26-50")
            print("   • Élevé: 51-125")
        else:
            print(f"❌ Erreur: {response.status_code}")

    except Exception as e:
        print(f"❌ Erreur: {e}")


def test_stats():
    """Affiche les statistiques de feedback."""
    print_header("STATISTIQUES")

    try:
        # Stats
        stats_response = httpx.get(f"{API_BASE_URL}/enrichment/feedback/stats", timeout=5)
        status_response = httpx.get(f"{API_BASE_URL}/enrichment/status", timeout=5)

        if stats_response.status_code == 200:
            print("\n📊 Statistiques des feedbacks:")
            print_json(stats_response.json())

        if status_response.status_code == 200:
            status = status_response.json()
            print("\n🔧 Statut du système:")
            print(f"   Entraînement en cours: {'Oui' if status.get('is_training') else 'Non'}")

            fb_data = status.get("feedback_data", {})
            print(f"   Total feedbacks: {fb_data.get('total', 0)}")
            print(f"   En attente d'entraînement: {fb_data.get('pending_training', 0)}")

    except Exception as e:
        print(f"❌ Erreur: {e}")


def test_liste_feedbacks():
    """Liste les derniers feedbacks."""
    print_header("DERNIERS FEEDBACKS")

    try:
        response = httpx.get(
            f"{API_BASE_URL}/enrichment/feedback/list?limit=5",
            timeout=5
        )

        if response.status_code == 200:
            data = response.json()
            total = data.get("total", 0)
            feedbacks = data.get("feedbacks", [])

            print(f"\n📋 Total: {total} feedbacks")

            if feedbacks:
                print("\n5 derniers feedbacks:")
                for i, fb in enumerate(feedbacks[:5], 1):
                    print(f"\n{i}. {fb.get('description', 'N/A')[:50]}...")
                    print(f"   Catégorie: {fb.get('category', 'N/A')}")
                    print(f"   Type: {fb.get('type', 'N/A')}")
                    print(f"   Score: {fb.get('score', 'N/A')}")
            else:
                print("   Aucun feedback enregistré.")

    except Exception as e:
        print(f"❌ Erreur: {e}")


def scenarios_predefinies():
    """Exécute des scénarios de test prédéfinis."""
    print_header("SCÉNARIOS DE TEST PRÉDÉFINIS")

    scenarios = [
        {
            "nom": "🔴 Cyberattaque Ransomware (Risque Élevé)",
            "data": {
                "description": "Cyberattaque par ransomware sur les serveurs de production. Données clients sensibles compromises.",
                "category": "Industriel",
                "type": "Cyber & SSI",
                "sector": "Technologie"
            }
        },
        {
            "nom": "🟡 Perte Client Majeur (Risque Moyen)",
            "data": {
                "description": "Perte potentielle d'un client représentant 15% du CA suite à des retards de livraison.",
                "category": "Projet/Programme",
                "type": "Commercial",
                "sector": "PME"
            }
        },
        {
            "nom": "🟢 Bug Interface Mineur (Risque Faible)",
            "data": {
                "description": "Bug d'affichage mineur sur l'interface mobile. Bouton parfois non cliquable.",
                "category": "Qualité",
                "type": "Technique",
                "sector": "Startup"
            }
        },
        {
            "nom": "🔴 Échec Levée de Fonds (Risque Élevé)",
            "data": {
                "description": "Échec de la levée de fonds série A. Trésorerie insuffisante pour 6 mois.",
                "category": "Projet/Programme",
                "type": "Financier",
                "sector": "Startup"
            }
        },
        {
            "nom": "🟡 Panne Système GPS (Risque Moyen)",
            "data": {
                "description": "Panne du système de géolocalisation de la flotte de véhicules.",
                "category": "Industriel",
                "type": "Technique",
                "sector": "Mobilité et Transport"
            }
        }
    ]

    print("\nScénarios disponibles:")
    for i, scenario in enumerate(scenarios, 1):
        print(f"  {i}. {scenario['nom']}")
    print(f"  {len(scenarios) + 1}. Exécuter tous les scénarios")

    try:
        choice = int(input("\nVotre choix: ").strip())

        if choice == len(scenarios) + 1:
            # Exécuter tous
            for scenario in scenarios:
                print(f"\n▶️ {scenario['nom']}")
                execute_scenario(scenario['data'])
        elif 1 <= choice <= len(scenarios):
            scenario = scenarios[choice - 1]
            print(f"\n▶️ {scenario['nom']}")
            execute_scenario(scenario['data'])
        else:
            print("❌ Choix invalide")

    except ValueError:
        print("❌ Entrez un numéro valide")


def execute_scenario(data: dict):
    """Exécute un scénario de test."""
    try:
        response = httpx.post(
            f"{API_BASE_URL}/hybrid-analyze",
            json=data,
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            score = result.get("score", 0)
            classification = result.get("classification", "N/A")

            if classification == "Eleve":
                emoji = "🔴"
            elif classification == "Moyen":
                emoji = "🟡"
            else:
                emoji = "🟢"

            print(f"   {emoji} Résultat: {classification} (Score: {score})")
            print(f"   G={result.get('G')}, F={result.get('F')}, P={result.get('P')}")
        else:
            print(f"   ❌ Erreur: {response.status_code}")

    except Exception as e:
        print(f"   ❌ Erreur: {e}")


def menu_principal():
    """Menu principal du script."""
    while True:
        print_header("SAFEQORE - TEST MANUEL")
        print("""
Options disponibles:

  1. 🔍 Analyser un risque (votre propre description)
  2. 📝 Soumettre un feedback
  3. 🎯 Exécuter des scénarios prédéfinis
  4. 📚 Voir les constantes STB
  5. 📊 Voir les statistiques
  6. 📋 Lister les derniers feedbacks
  7. ❤️  Vérifier la santé de l'API
  0. 🚪 Quitter
""")

        choice = input("Votre choix: ").strip()

        if choice == "1":
            test_analyse_risque()
        elif choice == "2":
            test_feedback()
        elif choice == "3":
            scenarios_predefinies()
        elif choice == "4":
            test_constantes()
        elif choice == "5":
            test_stats()
        elif choice == "6":
            test_liste_feedbacks()
        elif choice == "7":
            check_api_health()
        elif choice == "0":
            print("\n👋 Au revoir!")
            break
        else:
            print("❌ Option invalide")

        input("\n[Appuyez sur Entrée pour continuer...]")


def main():
    """Point d'entrée principal."""
    print("\n" + "=" * 60)
    print("   🛡️  SAFEQORE - Script de Test Manuel")
    print("   Analyse des risques par méthodologie KINNEY")
    print("=" * 60)

    if not check_api_health():
        return

    menu_principal()


if __name__ == "__main__":
    main()
