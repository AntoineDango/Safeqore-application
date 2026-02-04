import ExcelJS from 'exceljs';
import { Platform } from 'react-native';
import { saveAs } from 'file-saver';
import * as FileSystem from 'expo-file-system';
let Sharing: any = null; try { Sharing = require('expo-sharing'); } catch {}
import type { AnalysisProject, RiskItem, CompareResponse } from './types';

const to100 = (raw: number) => Math.round((raw / 125) * 100);

function abToBase64(ab: ArrayBuffer): string {
  const bytes = new Uint8Array(ab);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode.apply(null, Array.from(sub) as any);
  }
  // btoa is available in React Native JS runtime
  // @ts-ignore
  return typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
}

async function saveWorkbookAdvanced(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  if (Platform.OS === 'web') {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);
    return;
  }
  const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory!;
  const fileUri = dir + filename;
  const base64 = abToBase64(buffer as ArrayBuffer);
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
  if (Sharing && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(fileUri);
  }
}

function addOverviewSheet(wb: ExcelJS.Workbook, project: AnalysisProject) {
  const ws = wb.addWorksheet('Vue d\'ensemble');
  ws.columns = [
    { header: 'Champ', key: 'k', width: 28 },
    { header: 'Valeur', key: 'v', width: 80 },
  ];
  const rows: Array<[string, string]> = [
    ['Titre', project.analysis_title],
    ['Type', project.project_type],
    ['Secteur', project.sector || ''],
    ['Description', project.project_description || ''],
    ['Services/Produits', project.entity_services || ''],
    ['Nombre de risques', String(project.risks.length)],
  ];
  rows.forEach(r => ws.addRow({ k: r[0], v: r[1] }));
}

function addDetailedSheet(wb: ExcelJS.Workbook, project: AnalysisProject) {
  const ws = wb.addWorksheet('Analyse détaillée');
  ws.addRow([
    'N°','Catégorie','Type','Description','G','F','P','Score (/100)','Mesure','G res.','F res.','P res.','Score res. (/100)'
  ]).font = { bold: true } as any;
  project.risks.forEach((r, i) => {
    ws.addRow([
      i+1, r.category, r.type, r.description,
      r.initial_evaluation.G, r.initial_evaluation.F, r.initial_evaluation.P, to100(r.initial_evaluation.score),
      r.mitigation_measure || '',
      r.residual_evaluation?.G || '', r.residual_evaluation?.F || '', r.residual_evaluation?.P || '',
      typeof r.residual_evaluation?.score === 'number' ? to100(r.residual_evaluation!.score) : ''
    ]);
  });
  ws.columns = [
    { width: 6 }, { width: 18 }, { width: 18 }, { width: 60 }, { width: 6 }, { width: 6 }, { width: 6 }, { width: 14 },
    { width: 40 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 18 },
  ] as any;
}

function addComparisonSheet(wb: ExcelJS.Workbook, project: AnalysisProject, pairs: Array<{ risk: RiskItem; comparison: CompareResponse }>) {
  const ws = wb.addWorksheet('Comparaison IA');
  ws.addRow([
    'N°','Risque','G (Hum)','F (Hum)','P (Hum)','Score Hum (/100)','G (IA)','F (IA)','P (IA)','Score IA (/100)','Classe IA','Accord','Concordance'
  ]).font = { bold: true } as any;
  pairs.forEach((p, i) => {
    ws.addRow([
      i+1,
      p.risk.description,
      p.comparison.human_analysis.G,
      p.comparison.human_analysis.F,
      p.comparison.human_analysis.P,
      to100(p.comparison.human_analysis.score),
      p.comparison.ia_analysis.G,
      p.comparison.ia_analysis.F,
      p.comparison.ia_analysis.P,
      to100(p.comparison.ia_analysis.score),
      p.comparison.ia_analysis.classification,
      p.comparison.comparison.agreement_level || 'N/A',
      p.comparison.comparison.classifications_match ? 'Oui' : 'Non',
    ]);
  });
  ws.columns = [
    { width: 6 }, { width: 60 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 16 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 14 },
  ] as any;
}

function addChartsDataSheet(wb: ExcelJS.Workbook, project: AnalysisProject, pairs: Array<{ risk: RiskItem; comparison: CompareResponse }>) {
  const ws = wb.addWorksheet('Graphiques');
  ws.addRow(['Risque', 'Score Humain (/100)', 'Score IA (/100)', 'Réduction (/100)']).font = { bold: true } as any;
  pairs.forEach(p => {
    const human = to100(p.comparison.human_analysis.score);
    const ia = to100(p.comparison.ia_analysis.score);
    ws.addRow([p.risk.description.slice(0, 50), human, ia, human - (p.risk.residual_evaluation ? to100(p.risk.residual_evaluation.score) : human)]);
  });
  ws.addRow([]);
  ws.addRow(['Note:', "ExcelJS ne supporte pas encore l\'insertion de graphiques. Cette feuille contient les données prêtes pour créer des graphiques directement dans Excel."]);
  ws.columns = [{ width: 60 }, { width: 22 }, { width: 18 }, { width: 18 }] as any;
}

function addIARecsSheet(wb: ExcelJS.Workbook, pairs: Array<{ risk: RiskItem; comparison: CompareResponse }>) {
  const ws = wb.addWorksheet('Recommandations IA');
  ws.addRow(['Risque', 'Recommandations IA']).font = { bold: true } as any;
  pairs.forEach(p => {
    const recs = (p.comparison.ia_analysis.recommendations || []).join('\n• ');
    ws.addRow([p.risk.description.slice(0, 80), recs ? '• ' + recs : '']);
  });
  ws.columns = [{ width: 60 }, { width: 100 }] as any;
}

export async function generateProjectExcelAdvanced(project: AnalysisProject): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SafeQore';
  wb.created = new Date();
  const ws = wb.addWorksheet("Rapport");
  ws.addRow(["Rapport d'analyse SafeQore"]).font = { bold: true, size: 16 } as any;
  ws.addRow([]);
  ws.addRow(["Titre", project.analysis_title]);
  ws.addRow(["Type", project.project_type]);
  ws.addRow(["Secteur", project.sector || ""]);
  ws.addRow(["Description", project.project_description || ""]);
  ws.addRow(["Services/Produits", project.entity_services || ""]);
  ws.addRow([]);
  ws.addRow(["Détails des risques"]).font = { bold: true } as any;
  ws.addRow(['N°','Catégorie','Type','Description','G','F','P','Score (/100)','Mesure','G res.','F res.','P res.','Score res. (/100)']).font = { bold: true } as any;
  project.risks.forEach((r, i) => {
    ws.addRow([
      i+1, r.category, r.type, r.description,
      r.initial_evaluation.G, r.initial_evaluation.F, r.initial_evaluation.P, to100(r.initial_evaluation.score),
      r.mitigation_measure || '',
      r.residual_evaluation?.G || '', r.residual_evaluation?.F || '', r.residual_evaluation?.P || '',
      typeof r.residual_evaluation?.score === 'number' ? to100(r.residual_evaluation!.score) : ''
    ]);
  });
  ws.columns = [
    { width: 6 }, { width: 18 }, { width: 18 }, { width: 60 }, { width: 6 }, { width: 6 }, { width: 6 }, { width: 14 },
    { width: 40 }, { width: 8 }, { width: 8 }, { width: 8 }, { width: 18 },
  ] as any;
  await saveWorkbookAdvanced(wb, 'safeqore_projet.xlsx');
}

export async function generateComparativeExcelAdvanced(
  project: AnalysisProject,
  iaComparisons: Array<{ risk: RiskItem; comparison: CompareResponse }>
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SafeQore';
  wb.created = new Date();
  const ws = wb.addWorksheet("Comparatif Humain vs IA");
  ws.addRow(["Comparaison Humain / IA"]).font = { bold: true, size: 16 } as any;
  ws.addRow([]);
  ws.addRow(["Titre", project.analysis_title]);
  ws.addRow(["Type", project.project_type]);
  ws.addRow(["Secteur", project.sector || ""]);
  ws.addRow([]);
  ws.addRow(['N°','Risque','G (Hum)','F (Hum)','P (Hum)','Score Hum (/100)','G (IA)','F (IA)','P (IA)','Score IA (/100)','Classe IA','Accord','Concordance']).font = { bold: true } as any;
  iaComparisons.forEach((p, i) => {
    ws.addRow([
      i+1,
      p.risk.description,
      p.comparison.human_analysis.G,
      p.comparison.human_analysis.F,
      p.comparison.human_analysis.P,
      to100(p.comparison.human_analysis.score),
      p.comparison.ia_analysis.G,
      p.comparison.ia_analysis.F,
      p.comparison.ia_analysis.P,
      to100(p.comparison.ia_analysis.score),
      p.comparison.ia_analysis.classification,
      p.comparison.comparison.agreement_level || 'N/A',
      p.comparison.comparison.classifications_match ? 'Oui' : 'Non',
    ]);
  });
  ws.columns = [
    { width: 6 }, { width: 60 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 16 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 14 },
  ] as any;
  await saveWorkbookAdvanced(wb, 'safeqore_projet_comparatif.xlsx');
}

