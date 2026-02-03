import * as XLSX from 'xlsx';
import { Platform } from 'react-native';
import type { AnalysisProject, RiskItem, CompareResponse } from './types';

// Lazy loading des modules natifs (uniquement sur mobile)
function getFileSystem() {
  if (Platform.OS === 'web') return null;
  return require('expo-file-system');
}

function getSharing() {
  if (Platform.OS === 'web') return null;
  return require('expo-sharing');
}

/**
 * Génère un rapport Excel pour un projet d'analyse
 */
export async function generateProjectExcel(project: AnalysisProject): Promise<void> {
  const rows = [];
  
  // En-tête
  rows.push([
    'Numéro',
    'Catégorie',
    'Type',
    'Description du risque',
    'Gravité (utilisateur)',
    'Fréquence (utilisateur)',
    'Probabilité (utilisateur)',
    'Résultat / Note globale (utilisateur)',
    'Description de la mesure de contournement',
    'Gravité (après contournement)',
    'Fréquence (après contournement)',
    'Probabilité (après contournement)',
    'Résultat / Note globale (après contournement)',
    'Commentaires'
  ]);
  
  // Données
  project.risks.forEach((risk, index) => {
    rows.push([
      index + 1,
      risk.category,
      risk.type,
      risk.description,
      risk.initial_evaluation.G,
      risk.initial_evaluation.F,
      risk.initial_evaluation.P,
      risk.initial_evaluation.score,
      risk.mitigation_measure || '',
      risk.residual_evaluation?.G || '',
      risk.residual_evaluation?.F || '',
      risk.residual_evaluation?.P || '',
      risk.residual_evaluation?.score || '',
      '' // Commentaires
    ]);
  });
  
  // Créer le classeur
  const ws = XLSX.utils.aoa_to_sheet(rows);
  
  // Appliquer le style aux en-têtes
  const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) continue;
    ws[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4472C4' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
  }
  
  // Ajuster la largeur des colonnes
  ws['!cols'] = [
    { wch: 8 },  // Numéro
    { wch: 20 }, // Catégorie
    { wch: 15 }, // Type
    { wch: 40 }, // Description
    { wch: 12 }, // G
    { wch: 12 }, // F
    { wch: 12 }, // P
    { wch: 15 }, // Score
    { wch: 40 }, // Mesure
    { wch: 12 }, // G résiduel
    { wch: 12 }, // F résiduel
    { wch: 12 }, // P résiduel
    { wch: 15 }, // Score résiduel
    { wch: 25 }  // Commentaires
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Analyse des risques');
  
  // Ajouter une feuille récapitulative
  const summaryRows = [
    ['Titre du projet', project.analysis_title],
    ['Type', project.project_type === 'project' ? 'Projet' : 'Entité'],
    ['Description', project.project_description],
    ['Secteur', project.sector || 'N/A'],
    ['Nombre de risques', project.risks.length],
    ['Risques traités', project.risks.filter(r => r.residual_evaluation).length],
    ['Date de création', new Date(project.created_at).toLocaleDateString('fr-FR')],
    ['Dernière mise à jour', new Date(project.updated_at).toLocaleDateString('fr-FR')]
  ];
  
  if (project.entity_type) {
    summaryRows.splice(3, 0, ['Type d\'entité', project.entity_type]);
  }
  
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  summaryWs['!cols'] = [{ wch: 25 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Récapitulatif');
  
  // Générer le fichier
  const filename = `${project.analysis_title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.xlsx`;
  await saveAndShareWorkbook(wb, filename);
}

/**
 * Génère un rapport Excel comparatif Humain vs IA
 */
export async function generateComparativeExcel(
  project: AnalysisProject,
  iaComparisons: Array<{ risk: RiskItem; comparison: CompareResponse }>
): Promise<void> {
  const rows = [];
  
  // En-tête étendu
  rows.push([
    'Numéro',
    'Catégorie',
    'Type',
    'Description du risque (Utilisateur)',
    'G (Utilisateur)',
    'F (Utilisateur)',
    'P (Utilisateur)',
    'Score (Utilisateur)',
    'Mesure de contournement',
    'G résiduel (Utilisateur)',
    'F résiduel (Utilisateur)',
    'P résiduel (Utilisateur)',
    'Score résiduel (Utilisateur)',
    'Description du risque selon l\'IA',
    'G (IA)',
    'F (IA)',
    'P (IA)',
    'Score (IA)',
    'Classification (IA)',
    'Préconisation / Solution IA',
    'Niveau d\'accord',
    'Classifications concordent'
  ]);
  
  // Données
  iaComparisons.forEach((item, index) => {
    const { risk, comparison } = item;
    const iaAnalysis = comparison.ia_analysis;
    const comparisonData = comparison.comparison;
    
    rows.push([
      index + 1,
      risk.category,
      risk.type,
      risk.description,
      risk.initial_evaluation.G,
      risk.initial_evaluation.F,
      risk.initial_evaluation.P,
      risk.initial_evaluation.score,
      risk.mitigation_measure || '',
      risk.residual_evaluation?.G || '',
      risk.residual_evaluation?.F || '',
      risk.residual_evaluation?.P || '',
      risk.residual_evaluation?.score || '',
      risk.description, // On pourrait enrichir avec l'analyse IA
      iaAnalysis.G,
      iaAnalysis.F,
      iaAnalysis.P,
      iaAnalysis.score,
      iaAnalysis.classification,
      (iaAnalysis.recommendations || []).join('; '),
      comparisonData.agreement_level || 'N/A',
      comparisonData.classifications_match ? 'Oui' : 'Non'
    ]);
  });
  
  const ws = XLSX.utils.aoa_to_sheet(rows);
  
  // Style des en-têtes
  const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) continue;
    ws[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '70AD47' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
    };
  }
  
  // Largeur des colonnes
  ws['!cols'] = new Array(22).fill({ wch: 15 });
  ws['!cols'][3] = { wch: 40 }; // Description
  ws['!cols'][8] = { wch: 40 }; // Mesure
  ws['!cols'][13] = { wch: 40 }; // Description IA
  ws['!cols'][19] = { wch: 50 }; // Préconisations
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Comparaison Humain-IA');
  
  // Ajouter une feuille de statistiques
  const statsRows = [
    ['Statistiques de comparaison'],
    [''],
    ['Total des risques analysés', iaComparisons.length],
    ['Classifications concordantes', iaComparisons.filter(c => c.comparison.comparison.classifications_match).length],
    ['Taux de concordance', `${Math.round((iaComparisons.filter(c => c.comparison.comparison.classifications_match).length / iaComparisons.length) * 100)}%`],
    [''],
    ['Répartition des accords'],
  ];
  
  // Compter les niveaux d'accord
  const agreementCounts: Record<string, number> = {};
  iaComparisons.forEach(c => {
    const level = c.comparison.comparison.agreement_level || 'Non défini';
    agreementCounts[level] = (agreementCounts[level] || 0) + 1;
  });
  
  Object.entries(agreementCounts).forEach(([level, count]) => {
    statsRows.push([level, count]);
  });
  
  const statsWs = XLSX.utils.aoa_to_sheet(statsRows);
  statsWs['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, statsWs, 'Statistiques');
  
  // Générer le fichier
  const filename = `Comparaison_IA_${project.analysis_title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.xlsx`;
  await saveAndShareWorkbook(wb, filename);
}

/**
 * Sauvegarde et partage un classeur Excel
 */
async function saveAndShareWorkbook(wb: XLSX.WorkBook, filename: string): Promise<void> {
  // Générer le fichier binaire
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  
  if (Platform.OS === 'web') {
    // Sur web, télécharger directement
    const blob = base64ToBlob(wbout, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    // Sur mobile, sauvegarder dans le système de fichiers et partager
    const FileSystem = getFileSystem();
    const Sharing = getSharing();
    
    if (!FileSystem || !Sharing) {
      throw new Error('Modules natifs non disponibles');
    }
    
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Partager le fichier
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Exporter le rapport',
        UTI: 'com.microsoft.excel.xlsx'
      });
    }
  }
}

/**
 * Convertit une chaîne base64 en Blob (pour le web)
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
