import React, { createContext, useContext, useMemo, useState } from "react";
import type { AnswerItem, Category, RiskType, Sector, QuestionnaireAnalyzeResponse, CompareResponse, EntityType } from "../lib/types";

export type RiskInProgress = {
  id: string;
  description: string;
  category: Category;
  type: RiskType;
  answers: AnswerItem[];
  userResult?: QuestionnaireAnalyzeResponse;
  mitigation?: string;
  residualResult?: QuestionnaireAnalyzeResponse;
};

export type AnalysisState = {
  // Informations du projet
  projectType?: "project" | "entity";
  projectDescription?: string;
  entityType?: EntityType;
  entityServices?: string;
  analysisTitle?: string;
  sector?: Sector;
  
  // Risques du projet (minimum 4)
  risks: RiskInProgress[];
  currentRiskIndex?: number;
  
  // Ancien flux (pour compatibilité)
  projectName?: string;
  description?: string;
  category?: Category;
  type?: RiskType;
  answers: AnswerItem[];
  userResult?: QuestionnaireAnalyzeResponse;
  compareResult?: CompareResponse;
  measures?: string[];
};

const defaultState: AnalysisState = {
  answers: [],
  risks: [],
};

export type AnalysisContextType = {
  state: AnalysisState;
  // Nouveau flux projet
  setProjectInfo: (type: "project" | "entity", description: string, title: string, sector?: string, entityType?: EntityType, entityServices?: string) => void;
  addRisk: (risk: RiskInProgress) => void;
  updateRisk: (index: number, risk: Partial<RiskInProgress>) => void;
  setCurrentRiskIndex: (index: number) => void;
  resetProject: () => void;
  // Ancien flux (compatibilité)
  setSector: (s: Sector) => void;
  setProjectName: (n?: string) => void;
  setRiskInfo: (d: string, c: Category, t: RiskType) => void;
  addAnswer: (a: AnswerItem) => void;
  replaceAnswers: (arr: AnswerItem[]) => void;
  resetFlow: () => void;
  setUserResult: (r: QuestionnaireAnalyzeResponse) => void;
  setCompareResult: (r: CompareResponse) => void;
  setMeasures: (m: string[]) => void;
};

const Ctx = createContext<AnalysisContextType | undefined>(undefined);

export const AnalysisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AnalysisState>(defaultState);

  const api: AnalysisContextType = useMemo(() => ({
    state,
    // Nouveau flux projet
    setProjectInfo: (type, description, title, sector, entityType, entityServices) => setState((prev) => ({
      ...prev,
      projectType: type,
      projectDescription: description,
      analysisTitle: title,
      sector,
      entityType,
      entityServices,
    })),
    addRisk: (risk) => setState((prev) => ({ ...prev, risks: [...prev.risks, risk] })),
    updateRisk: (index, risk) => setState((prev) => ({
      ...prev,
      risks: prev.risks.map((r, i) => i === index ? { ...r, ...risk } : r),
    })),
    setCurrentRiskIndex: (index) => setState((prev) => ({ ...prev, currentRiskIndex: index })),
    resetProject: () => setState(defaultState),
    // Ancien flux (compatibilité)
    setSector: (s) => setState((prev) => ({ ...prev, sector: s })),
    setProjectName: (n) => setState((prev) => ({ ...prev, projectName: n })),
    setRiskInfo: (d, c, t) => setState((prev) => ({ ...prev, description: d, category: c, type: t })),
    addAnswer: (a) => setState((prev) => ({ ...prev, answers: [...prev.answers.filter(x => x.question_id !== a.question_id), a] })),
    replaceAnswers: (arr) => setState((prev) => ({ ...prev, answers: arr })),
    resetFlow: () => setState(defaultState),
    setUserResult: (r) => setState((prev) => ({ ...prev, userResult: r })),
    setCompareResult: (r) => setState((prev) => ({ ...prev, compareResult: r })),
    setMeasures: (m) => setState((prev) => ({ ...prev, measures: m })),
  }), [state]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
};

export const useAnalysis = (): AnalysisContextType => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAnalysis must be used within AnalysisProvider");
  return ctx;
};
