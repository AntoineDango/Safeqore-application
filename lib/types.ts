export type Sector = string;
export type Category = "Projet/Programme" | "Industriel" | "Qualité";
export type RiskType = "Commercial" | "Financier" | "Technique" | "Cyber & SSI";

export type QuestionOption = {
  id: string;
  label: string;
  contribution: 1 | 2 | 3 | 4 | 5;
  niveau?: "Faible" | "Modéré" | "Élevé";
};

export type Question = {
  id: string;
  dimension: "G" | "F" | "P";
  texte_question: string;
  reponses_possibles: QuestionOption[];
  poids?: number;
  secteurs_concernes?: string[];
};

export type QuestionnaireQuestionsResponse = {
  version: string;
  questions: Question[];
};

export type AnswerItem = {
  question_id: string;
  option_id: string;
};

export type QuestionnaireAnalyzeRequest = {
  description: string;
  category: Category;
  type: RiskType;
  sector?: Sector;
  answers: AnswerItem[];
};

export type QuestionnaireAnalyzeResponse = {
  id: string;
  timestamp: string;
  questionnaire_version: string;
  description: string;
  category: Category;
  type: RiskType;
  sector: Sector;
  answers: AnswerItem[];
  details: Record<string, Array<Record<string, any>>>;
  method: string;
  G: number;
  F: number;
  P: number;
  score: number;
  classification: "Faible" | "Modéré" | "Élevé";
  justification: string;
  normalized_score_100: number;
};

export type CompareRequest = {
  description: string;
  category: Category;
  type: RiskType;
  sector?: Sector;
  user_G: number;
  user_F: number;
  user_P: number;
  user_classification?: "Faible" | "Modéré" | "Élevé";
};

export type CompareResponse = {
  human_analysis: {
    G: number; F: number; P: number; score: number; classification: string;
  };
  ia_analysis: {
    G: number; F: number; P: number; score: number; classification: string;
    causes?: string[]; recommendations?: string[]; justification?: string;
  };
  comparison: Record<string, any> & {
    agreement_level?: string;
    classifications_match?: boolean;
  };
};

export type TraceListResponse = {
  total: number;
  limit: number;
  offset: number;
  items: QuestionnaireAnalyzeResponse[];
};

export type ConstantsResponse = {
  categories: Category[];
  types: RiskType[];
  sectors: string[];
  classifications?: Array<"Faible"|"Modéré"|"Élevé">;
  kinney_thresholds?: Record<string, any>;
};

// Residual (post-measure) re-estimation types (MVP)
export type ResidualMeasure = {
  text: string;
  impacted: Partial<Record<"G"|"F"|"P", boolean>>;
  new_values: Partial<Record<"G"|"F"|"P", number>>;
  answers_by_dim?: Partial<Record<"G"|"F"|"P", AnswerItem[]>>;
};

export type ResidualRequest = {
  parent_id: string; // id de l'analyse initiale
  measures: ResidualMeasure[];
};

export type ResidualResponseItem = QuestionnaireAnalyzeResponse & {
  parent_id?: string;
  measure_text?: string;
};

export type ResidualResponse = {
  items: ResidualResponseItem[];
};

// User analyses (per-account) types
export type UserAnalysis = {
  id: string;
  timestamp: string;
  description: string;
  category: Category;
  type: RiskType;
  G: number;
  F: number;
  P: number;
  score: number;
  computed_classification: string;
  user_classification?: string;
  mitigation?: string;
  sector?: Sector;
};

export type UserAnalysisListResponse = {
  total: number;
  limit: number;
  offset: number;
  analyses: UserAnalysis[];
};
