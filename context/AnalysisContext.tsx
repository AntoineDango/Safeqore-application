import React, { createContext, useContext, useMemo, useState } from "react";
import type { AnswerItem, Category, RiskType, Sector, QuestionnaireAnalyzeResponse, CompareResponse } from "../lib/types";

export type AnalysisState = {
  // Context
  sector?: Sector;
  projectName?: string;
  description?: string;
  category?: Category;
  type?: RiskType;
  answers: AnswerItem[];
  // Results
  userResult?: QuestionnaireAnalyzeResponse;
  compareResult?: CompareResponse;
  measures?: string[];
};

const defaultState: AnalysisState = {
  answers: [],
};

export type AnalysisContextType = {
  state: AnalysisState;
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
