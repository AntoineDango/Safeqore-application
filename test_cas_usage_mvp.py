#!/usr/bin/env python3
"""
Script de test des cas d'usage MVP SafeQore.
Basé sur les exemples du cahier des charges STB.

Les 4 cas d'usage :
- Cas 1 : TPE agricole - nouveau projet agro-alimentaire
- Cas 2 : PME/ETI mobilité - calculateur moteurs hybride/électrique
- Cas 3 : Startup - conception drone surveillance/sécurité
- Cas 4 : Commerçant/artisan - création commerce
"""

import json
import sys

try:
    import httpx
except ImportError:
    print("❌ Installez httpx : pip install httpx")
    sys.exit(1)

API_BASE_URL = "http://localhost:4000"


def print_header(title: str):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_result(data: dict, title: str = "RÉSULTAT"):
    print(f"\n📊 {title}:")
    print(f"   G={data.get('G', 'N/A')} | F={data.get('F', 'N/A')} | P={data.get('P', 'N/A')}")
    print(f"   Score: {data.get('score', 'N/A')}/125")

    classification = data.get('classification', data.get('computed_classification', 'N/A'))
    if classification == "Eleve":
        emoji = "🔴"
    elif classification == "Moyen":
        emoji = "🟡"
    else:
        emoji = "🟢"
    print(f"   Classification: {emoji} {classification}")

    if data.get('recommendation') or data.get('llm_recommendation'):
        print(f"\n💡 Recommandation IA:")
        print(f"   {data.get('recommendation') or data.get('llm_recommendation')}")


def test_ia_analyze(request_data: dict) -> dict:
    """Test de l'analyse IA."""
    try:
        response = httpx.post(f"{API_BASE_URL}/ia/analyze", json=request_data, timeout=60)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"   ❌ Erreur {response.status_code}: {response.json().get('detail', 'Erreur')}")
            return None
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        return None


def test_user_analyze(request_data: dict) -> dict:
    """Test de l'analyse utilisateur."""
    try:
        response = httpx.post(f"{API_BASE_URL}/user/analyze", json=request_data, timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"   ❌ Erreur {response.status_code}: {response.json().get('detail', 'Erreur')}")
            return None
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        return None


def test_compare(request_data: dict) -> dict:
    """Test de la comparaison humain vs IA."""
    try:
        response = httpx.post(f"{API_BASE_URL}/compare", json=request_data, timeout=60)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"   ❌ Erreur {response.status_code}: {response.json().get('detail', 'Erreur')}")
            return None
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        return None


# ============================================================================
# CAS 1 : TPE AGRICOLE / AGRO-ALIMENTAIRE
# ============================================================================
def cas_1_tpe_agricole():
    """
    Cas 1 : Un utilisateur (dirigeant/associé) d'une TPE dans le secteur agricole
    (+agro-alimentaire) se connecte, réalise une évaluation des risques liés à un
    nouveau projet, obtient des recommandations d'IA, compare les deux approches.
    """
    print_header("CAS 1 : TPE AGRICOLE / AGRO-ALIMENTAIRE")
    print("""
👤 Profil : Dirigeant d'une TPE agricole
📋 Projet : Nouveau projet agro-alimentaire (transformation de produits bio)
🎯 Objectif : Évaluer les risques, comparer avec l'IA
""")

    # Risques à analyser pour ce cas
    risques = [
        {
            "nom": "Risque de contamination des produits",
            "description": "Risque de contamination bactériologique des produits transformés (confitures, conserves) dû à un défaut de stérilisation ou de chaîne du froid.",
            "category": "Qualité",
            "type": "Technique",
            "sector": "Agriculture",
            "user_G": 4, "user_F": 2, "user_P": 3  # Évaluation utilisateur
        },
        {
            "nom": "Perte de certification bio",
            "description": "Risque de perte de la certification Agriculture Biologique suite à une non-conformité lors d'un audit ou utilisation accidentelle de produits non autorisés.",
            "category": "Qualité",
            "type": "Commercial",
            "sector": "Agriculture",
            "user_G": 5, "user_F": 1, "user_P": 2
        },
        {
            "nom": "Défaillance fournisseur",
            "description": "Risque de rupture d'approvisionnement en matières premières bio locales suite à une mauvaise récolte ou défaillance d'un fournisseur clé.",
            "category": "Projet/Programme",
            "type": "Commercial",
            "sector": "Agriculture",
            "user_G": 3, "user_F": 2, "user_P": 3
        }
    ]

    print("-" * 70)

    for i, risque in enumerate(risques, 1):
        print(f"\n📌 RISQUE {i}: {risque['nom']}")
        print(f"   {risque['description'][:80]}...")

        # 1. Analyse utilisateur
        print("\n   👤 ANALYSE UTILISATEUR:")
        user_request = {
            "description": risque["description"],
            "category": risque["category"],
            "type": risque["type"],
            "sector": risque["sector"],
            "G": risque["user_G"],
            "F": risque["user_F"],
            "P": risque["user_P"],
            "mitigation": "À définir après analyse"
        }
        user_result = test_user_analyze(user_request)
        if user_result:
            score = risque["user_G"] * risque["user_F"] * risque["user_P"]
            print(f"      G={risque['user_G']} | F={risque['user_F']} | P={risque['user_P']} → Score={score}")
            print(f"      Classification: {user_result.get('computed_classification')}")

        # 2. Analyse IA
        print("\n   🤖 ANALYSE IA:")
        ia_request = {
            "description": risque["description"],
            "category": risque["category"],
            "type": risque["type"],
            "sector": risque["sector"]
        }
        ia_result = test_ia_analyze(ia_request)
        if ia_result:
            print(f"      G={ia_result['G']} | F={ia_result['F']} | P={ia_result['P']} → Score={ia_result['score']}")
            print(f"      Classification: {ia_result['classification']}")
            if ia_result.get('recommendation'):
                print(f"      💡 {ia_result['recommendation'][:100]}...")

        # 3. Comparaison
        print("\n   ⚖️ COMPARAISON:")
        compare_request = {
            "description": risque["description"],
            "category": risque["category"],
            "type": risque["type"],
            "sector": risque["sector"],
            "user_G": risque["user_G"],
            "user_F": risque["user_F"],
            "user_P": risque["user_P"]
        }
        compare_result = test_compare(compare_request)
        if compare_result:
            comp = compare_result.get("comparison", {})
            print(f"      Accord: {comp.get('agreement_level', 'N/A').upper()}")
            print(f"      {comp.get('agreement_message', '')}")


# ============================================================================
# CAS 2 : PME/ETI MOBILITÉ
# ============================================================================
def cas_2_pme_mobilite():
    """
    Cas 2 : Un utilisateur (chef de projet/programme, responsable qualité, manager contrat)
    d'une PME/ETI dans le secteur de la mobilité (automobile, ferroviaire, maritime,
    aviation civile) se connecte pour réaliser une évaluation des risques liés à un
    nouveau projet de création d'un calculateur pour moteurs hybride et électrique.
    """
    print_header("CAS 2 : PME/ETI MOBILITÉ - CALCULATEUR MOTEURS")
    print("""
👤 Profil : Chef de projet dans une PME/ETI
📋 Projet : Développement d'un calculateur pour moteurs hybride/électrique
🏭 Secteur : Mobilité (automobile, ferroviaire, maritime, aviation)
""")

    risques = [
        {
            "nom": "Défaillance technique du calculateur",
            "description": "Risque de bug logiciel critique dans le calculateur de gestion moteur pouvant entraîner une panne du véhicule ou un comportement dangereux du système de propulsion hybride.",
            "category": "Industriel",
            "type": "Technique",
            "sector": "Mobilité et Transport",
            "user_G": 5, "user_F": 2, "user_P": 3
        },
        {
            "nom": "Non-conformité normes automobiles",
            "description": "Risque de non-conformité aux normes ISO 26262 (sécurité fonctionnelle automobile) ou aux réglementations d'homologation européennes, bloquant la mise sur le marché.",
            "category": "Qualité",
            "type": "Technique",
            "sector": "Mobilité et Transport",
            "user_G": 4, "user_F": 2, "user_P": 2
        },
        {
            "nom": "Cyberattaque sur le système embarqué",
            "description": "Risque d'intrusion malveillante dans le système embarqué via les interfaces de communication (CAN bus, OTA updates) permettant de prendre le contrôle du calculateur.",
            "category": "Industriel",
            "type": "Cyber & SSI",
            "sector": "Mobilité et Transport",
            "user_G": 5, "user_F": 2, "user_P": 4
        },
        {
            "nom": "Retard de développement",
            "description": "Risque de dépassement des délais de développement dû à la complexité technique de l'intégration moteur thermique/électrique, impactant les engagements contractuels avec le constructeur.",
            "category": "Projet/Programme",
            "type": "Commercial",
            "sector": "Mobilité et Transport",
            "user_G": 3, "user_F": 3, "user_P": 4
        },
        {
            "nom": "Pénurie de composants électroniques",
            "description": "Risque de rupture d'approvisionnement en semi-conducteurs et composants électroniques critiques pour la fabrication du calculateur, dans un contexte de tensions sur la supply chain mondiale.",
            "category": "Projet/Programme",
            "type": "Financier",
            "sector": "Mobilité et Transport",
            "user_G": 4, "user_F": 3, "user_P": 3
        }
    ]

    print("-" * 70)

    for i, risque in enumerate(risques, 1):
        print(f"\n📌 RISQUE {i}: {risque['nom']}")

        # Analyse utilisateur
        user_score = risque["user_G"] * risque["user_F"] * risque["user_P"]
        print(f"   👤 Utilisateur: G={risque['user_G']} F={risque['user_F']} P={risque['user_P']} → Score={user_score}")

        # Enregistrer l'analyse utilisateur
        user_request = {
            "description": risque["description"],
            "category": risque["category"],
            "type": risque["type"],
            "sector": risque["sector"],
            "G": risque["user_G"],
            "F": risque["user_F"],
            "P": risque["user_P"]
        }
        test_user_analyze(user_request)

        # Analyse IA
        ia_request = {
            "description": risque["description"],
            "category": risque["category"],
            "type": risque["type"],
            "sector": risque["sector"]
        }
        ia_result = test_ia_analyze(ia_request)
        if ia_result:
            print(f"   🤖 IA: G={ia_result['G']} F={ia_result['F']} P={ia_result['P']} → Score={ia_result['score']}")

            # Comparaison rapide
            diff = abs(user_score - ia_result['score'])
            if diff <= 10:
                print(f"   ✅ Accord fort (écart: {diff})")
            elif diff <= 25:
                print(f"   🟡 Accord modéré (écart: {diff})")
            else:
                print(f"   ⚠️ Divergence significative (écart: {diff})")


# ============================================================================
# CAS 3 : STARTUP DRONE
# ============================================================================
def cas_3_startup_drone():
    """
    Cas 3 : Un utilisateur (co-fondateur) d'une startup se connecte pour lancer
    une analyse de risques dans le but de démarrer la conception d'un drone
    dans le domaine de la surveillance et de la sécurité.
    """
    print_header("CAS 3 : STARTUP - DRONE SURVEILLANCE/SÉCURITÉ")
    print("""
👤 Profil : Co-fondateur de startup
📋 Projet : Conception d'un drone de surveillance et sécurité
🚀 Contexte : Phase de démarrage, levée de fonds en cours
""")

    risques = [
        {
            "nom": "Non-conformité réglementation aérienne",
            "description": "Risque de non-conformité aux réglementations DGAC/EASA pour les drones (catégorie spécifique, zones de vol, certification). Impossibilité d'obtenir les autorisations de vol nécessaires.",
            "category": "Qualité",
            "type": "Technique",
            "sector": "Startup",
            "user_G": 5, "user_F": 2, "user_P": 3
        },
        {
            "nom": "Vol de propriété intellectuelle",
            "description": "Risque de copie ou vol des algorithmes de navigation autonome et de traitement d'image par des concurrents ou via une faille de sécurité informatique.",
            "category": "Industriel",
            "type": "Cyber & SSI",
            "sector": "Startup",
            "user_G": 4, "user_F": 2, "user_P": 3
        },
        {
            "nom": "Échec de la levée de fonds",
            "description": "Risque d'échec de la levée de fonds Seed/Série A nécessaire au développement du prototype et à l'industrialisation. Trésorerie limitée à 8 mois.",
            "category": "Projet/Programme",
            "type": "Financier",
            "sector": "Startup",
            "user_G": 5, "user_F": 2, "user_P": 3
        },
        {
            "nom": "Accident lors des tests",
            "description": "Risque d'accident du drone lors des phases de test (crash, collision, blessure de personne) entraînant responsabilité civile et impact réputationnel.",
            "category": "Industriel",
            "type": "Technique",
            "sector": "Startup",
            "user_G": 5, "user_F": 3, "user_P": 2
        },
        {
            "nom": "Violation de vie privée",
            "description": "Risque juridique lié à la captation d'images de personnes sans consentement lors des missions de surveillance. Non-conformité RGPD et CNIL.",
            "category": "Qualité",
            "type": "Cyber & SSI",
            "sector": "Startup",
            "user_G": 4, "user_F": 3, "user_P": 3
        }
    ]

    print("-" * 70)

    for i, risque in enumerate(risques, 1):
        print(f"\n📌 RISQUE {i}: {risque['nom']}")

        user_score = risque["user_G"] * risque["user_F"] * risque["user_P"]
        print(f"   👤 Évaluation co-fondateur: G={risque['user_G']} F={risque['user_F']} P={risque['user_P']} → Score={user_score}")

        # Enregistrer
        user_request = {
            "description": risque["description"],
            "category": risque["category"],
            "type": risque["type"],
            "sector": risque["sector"],
            "G": risque["user_G"],
            "F": risque["user_F"],
            "P": risque["user_P"],
            "mitigation": ""
        }
        test_user_analyze(user_request)

        # IA
        ia_result = test_ia_analyze({
            "description": risque["description"],
            "category": risque["category"],
            "type": risque["type"],
            "sector": risque["sector"]
        })
        if ia_result:
            print(f"   🤖 IA: G={ia_result['G']} F={ia_result['F']} P={ia_result['P']} → Score={ia_result['score']} ({ia_result['classification']})")


# ============================================================================
# CAS 4 : COMMERÇANT / ARTISAN
# ============================================================================
def cas_4_commercant_artisan():
    """
    Cas 4 : Un utilisateur (commerçant ou artisan) se prépare à créer son commerce.
    Il utilise l'application pour se rendre compte des risques liés à son activité
    et pouvoir disposer de solutions pour y faire face.
    """
    print_header("CAS 4 : COMMERÇANT / ARTISAN - CRÉATION COMMERCE")
    print("""
👤 Profil : Artisan boulanger-pâtissier
📋 Projet : Ouverture d'une boulangerie artisanale
🏪 Contexte : Création d'entreprise, recherche de local
""")

    risques = [
        {
            "nom": "Problème de trésorerie",
            "description": "Risque de difficultés de trésorerie dans les premiers mois d'activité dû aux investissements initiaux (four, équipements, aménagement) et au délai pour atteindre le seuil de rentabilité.",
            "category": "Projet/Programme",
            "type": "Financier",
            "sector": "TPE",
            "user_G": 4, "user_F": 3, "user_P": 3
        },
        {
            "nom": "Non-conformité sanitaire",
            "description": "Risque de fermeture administrative suite à un contrôle sanitaire défavorable (DDPP). Non-respect des normes HACCP, problème de traçabilité ou de conservation des produits.",
            "category": "Qualité",
            "type": "Technique",
            "sector": "TPE",
            "user_G": 5, "user_F": 2, "user_P": 2
        },
        {
            "nom": "Panne de four",
            "description": "Risque de panne du four principal entraînant une interruption de production et perte de chiffre d'affaires. Délai de réparation pouvant atteindre plusieurs jours.",
            "category": "Industriel",
            "type": "Technique",
            "sector": "TPE",
            "user_G": 4, "user_F": 2, "user_P": 3
        },
        {
            "nom": "Concurrence grande distribution",
            "description": "Risque de perte de clientèle face à la concurrence des terminaux de cuisson des supermarchés proposant du pain à bas prix.",
            "category": "Projet/Programme",
            "type": "Commercial",
            "sector": "TPE",
            "user_G": 3, "user_F": 4, "user_P": 3
        },
        {
            "nom": "Accident du travail",
            "description": "Risque d'accident du travail (brûlure, coupure, chute) pour le boulanger ou ses employés. Arrêt de travail impactant la production.",
            "category": "Industriel",
            "type": "Technique",
            "sector": "TPE",
            "user_G": 3, "user_F": 3, "user_P": 2
        },
        {
            "nom": "Vol ou cambriolage",
            "description": "Risque de vol de la caisse ou cambriolage du commerce pendant la nuit. Perte financière et dégâts matériels.",
            "category": "Industriel",
            "type": "Financier",
            "sector": "TPE",
            "user_G": 3, "user_F": 2, "user_P": 3
        }
    ]

    print("-" * 70)

    print("\n📋 ANALYSE DES RISQUES POUR L'OUVERTURE DE LA BOULANGERIE:\n")

    resultats = []

    for i, risque in enumerate(risques, 1):
        print(f"   {i}. {risque['nom']}")

        user_score = risque["user_G"] * risque["user_F"] * risque["user_P"]

        # Classification
        if user_score <= 25:
            classe = "Faible 🟢"
        elif user_score <= 50:
            classe = "Moyen 🟡"
        else:
            classe = "Élevé 🔴"

        print(f"      Score: {user_score} → {classe}")

        # Enregistrer
        test_user_analyze({
            "description": risque["description"],
            "category": risque["category"],
            "type": risque["type"],
            "sector": risque["sector"],
            "G": risque["user_G"],
            "F": risque["user_F"],
            "P": risque["user_P"]
        })

        resultats.append({
            "nom": risque["nom"],
            "score": user_score,
            "classe": classe
        })

    # Résumé
    print("\n" + "-" * 70)
    print("\n📊 SYNTHÈSE DES RISQUES (triés par score):\n")

    resultats_tries = sorted(resultats, key=lambda x: x["score"], reverse=True)
    for r in resultats_tries:
        print(f"   {r['score']:3d} | {r['classe']:12s} | {r['nom']}")

    # Demander analyse IA pour le risque le plus élevé
    print("\n" + "-" * 70)
    risque_max = max(risques, key=lambda x: x["user_G"] * x["user_F"] * x["user_P"])
    print(f"\n🤖 ANALYSE IA DU RISQUE PRINCIPAL: {risque_max['nom']}")

    ia_result = test_ia_analyze({
        "description": risque_max["description"],
        "category": risque_max["category"],
        "type": risque_max["type"],
        "sector": risque_max["sector"]
    })
    if ia_result:
        print(f"\n   Score IA: {ia_result['score']} ({ia_result['classification']})")
        if ia_result.get('recommendation'):
            print(f"\n   💡 Recommandation:")
            print(f"   {ia_result['recommendation']}")


# ============================================================================
# MENU PRINCIPAL
# ============================================================================
def check_api():
    """Vérifie que l'API est accessible."""
    try:
        response = httpx.get(f"{API_BASE_URL}/health", timeout=5)
        return response.status_code == 200
    except:
        return False


def main():
    print("""
╔══════════════════════════════════════════════════════════════════════╗
║           TESTS CAS D'USAGE MVP SAFEQORE                             ║
║           Basé sur le cahier des charges STB                         ║
╚══════════════════════════════════════════════════════════════════════╝
""")

    if not check_api():
        print("❌ L'API n'est pas accessible sur http://localhost:4000")
        print("   Démarrez le serveur avec: uvicorn app.main:app --port 4000")
        return

    print("✅ API SafeQore connectée\n")

    while True:
        print("""
Sélectionnez un cas d'usage à tester:

  1. 🌾 Cas 1 : TPE Agricole / Agro-alimentaire
  2. 🚗 Cas 2 : PME/ETI Mobilité - Calculateur moteurs
  3. 🚁 Cas 3 : Startup - Drone surveillance/sécurité
  4. 🥖 Cas 4 : Commerçant/Artisan - Création boulangerie

  5. 🔄 Exécuter TOUS les cas
  0. 🚪 Quitter
""")

        choice = input("Votre choix: ").strip()

        if choice == "1":
            cas_1_tpe_agricole()
        elif choice == "2":
            cas_2_pme_mobilite()
        elif choice == "3":
            cas_3_startup_drone()
        elif choice == "4":
            cas_4_commercant_artisan()
        elif choice == "5":
            cas_1_tpe_agricole()
            cas_2_pme_mobilite()
            cas_3_startup_drone()
            cas_4_commercant_artisan()
        elif choice == "0":
            print("\n👋 Au revoir!")
            break
        else:
            print("❌ Choix invalide")

        input("\n[Appuyez sur Entrée pour continuer...]")


if __name__ == "__main__":
    main()
