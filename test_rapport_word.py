#!/usr/bin/env python3
"""
Script de test pour vérifier les rapports Word avec score sur 100 et graphiques.
"""

import requests
import json
from pathlib import Path

BASE_URL = "http://localhost:8000"

def test_compare_report():
    """Test du rapport de comparaison Humain vs IA."""
    print("\n" + "="*60)
    print("TEST 1: Rapport de comparaison (Humain vs IA)")
    print("="*60)
    
    payload = {
        "description": "Risque de cyberattaque sur le système de paiement en ligne",
        "category": "Industriel",
        "type": "Cyber & SSI",
        "sector": "Technologie",
        "user_G": 4,
        "user_F": 2,
        "user_P": 4
    }
    
    print(f"\n📊 Données de test:")
    print(f"   G: {payload['user_G']} | F: {payload['user_F']} | P: {payload['user_P']}")
    
    # Calcul du score attendu
    score_125 = payload['user_G'] * payload['user_F'] * payload['user_P']
    score_100 = int(round(score_125 / 125 * 100))
    print(f"   Score brut: {score_125}/125")
    print(f"   Score normalisé attendu: {score_100}/100")
    
    try:
        response = requests.post(
            f"{BASE_URL}/compare/report",
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            # Sauvegarder le fichier
            output_file = Path("test_compare_report.docx")
            output_file.write_bytes(response.content)
            print(f"\n✅ Rapport généré avec succès!")
            print(f"   Fichier: {output_file.absolute()}")
            print(f"   Taille: {len(response.content)} octets")
            print(f"\n📄 Ouvrez le fichier pour vérifier:")
            print(f"   - Score affiché sur 100 (pas 125)")
            print(f"   - Graphiques visuels avec barres")
            print(f"   - Tableau comparatif Utilisateur vs IA")
            return True
        else:
            print(f"\n❌ Erreur: {response.status_code}")
            print(f"   {response.text}")
            return False
            
    except Exception as e:
        print(f"\n❌ Exception: {e}")
        return False


def test_questionnaire_report():
    """Test du rapport de questionnaire."""
    print("\n" + "="*60)
    print("TEST 2: Rapport de questionnaire")
    print("="*60)
    
    # D'abord, créer une analyse via le questionnaire
    print("\n📝 Création d'une analyse de questionnaire...")
    
    questionnaire_payload = {
        "description": "Test de rapport avec score sur 100",
        "category": "Industriel",
        "type": "Cyber & SSI",
        "sector": "Technologie",
        "method": "Questionnaire",
        "answers": {
            "G": {
                "Q1": 4,
                "Q2": 3,
                "Q3": 5
            },
            "F": {
                "Q1": 2,
                "Q2": 2,
                "Q3": 3
            },
            "P": {
                "Q1": 4,
                "Q2": 4,
                "Q3": 3
            }
        }
    }
    
    try:
        # Créer l'analyse
        response = requests.post(
            f"{BASE_URL}/questionnaire/analyze",
            json=questionnaire_payload,
            timeout=30
        )
        
        if response.status_code != 200:
            print(f"❌ Erreur lors de la création: {response.status_code}")
            print(f"   {response.text}")
            return False
        
        data = response.json()
        analysis_id = data.get("id")
        score_100 = data.get("normalized_score_100")
        
        print(f"✅ Analyse créée: {analysis_id}")
        print(f"   G: {data.get('G')} | F: {data.get('F')} | P: {data.get('P')}")
        print(f"   Score: {score_100}/100")
        print(f"   Classification: {data.get('classification')}")
        
        # Télécharger le rapport
        print(f"\n📥 Téléchargement du rapport...")
        report_response = requests.get(
            f"{BASE_URL}/questionnaire/{analysis_id}/report",
            timeout=30
        )
        
        if report_response.status_code == 200:
            output_file = Path("test_questionnaire_report.docx")
            output_file.write_bytes(report_response.content)
            print(f"\n✅ Rapport généré avec succès!")
            print(f"   Fichier: {output_file.absolute()}")
            print(f"   Taille: {len(report_response.content)} octets")
            print(f"\n📄 Ouvrez le fichier pour vérifier:")
            print(f"   - Score affiché sur 100 (pas 125)")
            print(f"   - Graphique du score global")
            print(f"   - Tableau des facteurs G/F/P avec barres")
            print(f"   - Matrice de risques")
            return True
        else:
            print(f"❌ Erreur téléchargement: {report_response.status_code}")
            return False
            
    except Exception as e:
        print(f"\n❌ Exception: {e}")
        return False


def main():
    """Fonction principale."""
    print("\n" + "🔬 " + "="*58)
    print("   TEST DES RAPPORTS WORD - Score sur 100 + Graphiques")
    print("="*60)
    
    # Vérifier que le serveur est accessible
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code != 200:
            print(f"\n❌ Le serveur n'est pas accessible à {BASE_URL}")
            print("   Démarrez le serveur avec: uvicorn app.main:app --reload")
            return
    except Exception as e:
        print(f"\n❌ Le serveur n'est pas accessible à {BASE_URL}")
        print(f"   Erreur: {e}")
        print("   Démarrez le serveur avec: uvicorn app.main:app --reload")
        return
    
    print(f"\n✅ Serveur accessible à {BASE_URL}")
    
    # Exécuter les tests
    results = []
    
    results.append(("Rapport de comparaison", test_compare_report()))
    results.append(("Rapport de questionnaire", test_questionnaire_report()))
    
    # Résumé
    print("\n" + "="*60)
    print("RÉSUMÉ DES TESTS")
    print("="*60)
    
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    total = len(results)
    passed = sum(1 for _, success in results if success)
    
    print(f"\n📊 Résultat: {passed}/{total} tests réussis")
    
    if passed == total:
        print("\n🎉 Tous les tests sont passés!")
        print("\n📁 Fichiers générés:")
        print("   - test_compare_report.docx")
        print("   - test_questionnaire_report.docx")
        print("\n💡 Ouvrez ces fichiers pour vérifier visuellement:")
        print("   1. Le score est bien sur 100 (pas 125)")
        print("   2. Les graphiques avec barres s'affichent")
        print("   3. Les tableaux sont bien formatés")
    else:
        print("\n⚠️  Certains tests ont échoué. Vérifiez les logs ci-dessus.")


if __name__ == "__main__":
    main()
