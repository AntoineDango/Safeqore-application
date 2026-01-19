#!/usr/bin/env python3
"""
Script de lancement des tests SafeQore.

Ce script permet aux utilisateurs de vérifier facilement que l'application
fonctionne correctement à travers les différents endpoints disponibles.

Usage:
    python run_tests.py                  # Exécuter tous les tests
    python run_tests.py --quick          # Tests rapides uniquement
    python run_tests.py --verbose        # Mode verbeux
    python run_tests.py --coverage       # Avec rapport de couverture
    python run_tests.py --health         # Test de santé uniquement
"""

import subprocess
import sys
import argparse
from pathlib import Path


def check_dependencies():
    """Vérifie que les dépendances de test sont installées."""
    required = ['pytest', 'httpx']
    missing = []

    for package in required:
        try:
            __import__(package)
        except ImportError:
            missing.append(package)

    if missing:
        print("⚠️  Dépendances de test manquantes:", ", ".join(missing))
        print("   Installez-les avec: pip install -r requirements-test.txt")
        return False
    return True


def run_health_check():
    """Exécute uniquement les tests de santé."""
    print("\n🏥 Tests de santé de l'API...\n")
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "tests/test_health.py", "-v"],
        cwd=Path(__file__).parent
    )
    return result.returncode


def run_quick_tests():
    """Exécute les tests rapides (sans les tests d'intégration lents)."""
    print("\n⚡ Tests rapides...\n")
    result = subprocess.run(
        [
            sys.executable, "-m", "pytest",
            "tests/test_health.py",
            "tests/test_enrichment.py",
            "-v", "--tb=short"
        ],
        cwd=Path(__file__).parent
    )
    return result.returncode


def run_all_tests(verbose=False, coverage=False):
    """Exécute tous les tests."""
    print("\n🧪 Exécution de tous les tests SafeQore...\n")

    cmd = [sys.executable, "-m", "pytest"]

    if verbose:
        cmd.append("-v")
    else:
        cmd.append("-v")
        cmd.append("--tb=short")

    if coverage:
        cmd.extend(["--cov=app", "--cov-report=term-missing"])

    result = subprocess.run(cmd, cwd=Path(__file__).parent)
    return result.returncode


def print_summary():
    """Affiche un résumé des tests disponibles."""
    print("""
╔══════════════════════════════════════════════════════════════════╗
║                     TESTS SAFEQORE API                           ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Tests disponibles:                                              ║
║  ─────────────────                                               ║
║                                                                  ║
║  🏥 test_health.py                                               ║
║     - Endpoint racine (/)                                        ║
║     - Endpoint santé (/health)                                   ║
║     - Documentation Swagger (/docs, /redoc)                      ║
║                                                                  ║
║  🔬 test_hybrid_analyze.py                                       ║
║     - Analyse hybride des risques (/hybrid-analyze)              ║
║     - Validation des entrées (catégories, types, secteurs)       ║
║     - Calcul du score Kinney (G × F × P)                         ║
║     - Gestion des erreurs LLM                                    ║
║                                                                  ║
║  📚 test_enrichment.py                                           ║
║     - Constantes API (/enrichment/constants)                     ║
║     - Soumission de feedbacks (/enrichment/feedback)             ║
║     - Statistiques (/enrichment/feedback/stats)                  ║
║     - Liste des feedbacks (/enrichment/feedback/list)            ║
║     - Statut d'entraînement (/enrichment/status)                 ║
║     - Ré-entraînement (/enrichment/retrain)                      ║
║                                                                  ║
║  🔗 test_integration.py                                          ║
║     - Flux complet de feedback                                   ║
║     - Scénarios d'analyse réels                                  ║
║     - Réconciliation LLM/ML/Kinney                               ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
""")


def main():
    parser = argparse.ArgumentParser(
        description="Exécute les tests SafeQore API"
    )
    parser.add_argument(
        "--quick", "-q",
        action="store_true",
        help="Exécuter uniquement les tests rapides"
    )
    parser.add_argument(
        "--health", "-H",
        action="store_true",
        help="Exécuter uniquement les tests de santé"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Mode verbeux"
    )
    parser.add_argument(
        "--coverage", "-c",
        action="store_true",
        help="Générer un rapport de couverture"
    )
    parser.add_argument(
        "--info", "-i",
        action="store_true",
        help="Afficher les informations sur les tests"
    )

    args = parser.parse_args()

    if args.info:
        print_summary()
        return 0

    if not check_dependencies():
        return 1

    print_summary()

    if args.health:
        return run_health_check()
    elif args.quick:
        return run_quick_tests()
    else:
        return run_all_tests(verbose=args.verbose, coverage=args.coverage)


if __name__ == "__main__":
    sys.exit(main())
