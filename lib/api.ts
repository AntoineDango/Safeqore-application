import { API_BASE_URL } from "./config";
import { getAuthHeader } from "./auth";
import type {
  QuestionnaireQuestionsResponse,
  QuestionnaireAnalyzeRequest,
  QuestionnaireAnalyzeResponse,
  CompareRequest,
  CompareResponse,
  TraceListResponse,
  ConstantsResponse,
  ResidualRequest,
  ResidualResponse,
  UserAnalysisListResponse,
} from "./types";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

export const getQuestions = (sector?: string) =>
  http<QuestionnaireQuestionsResponse>(
    sector ? `/questionnaire/questions?sector=${encodeURIComponent(sector)}` : "/questionnaire/questions"
  );

export const analyzeQuestionnaire = (payload: QuestionnaireAnalyzeRequest) =>
  http<QuestionnaireAnalyzeResponse>("/questionnaire/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const compareAnalyses = (payload: CompareRequest) =>
  http<CompareResponse>("/compare", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const listTraces = (limit = 50, offset = 0) =>
  http<TraceListResponse>(`/questionnaire/analyses?limit=${limit}&offset=${offset}`);

export const getTrace = (id: string) => http(`/questionnaire/analyses/${encodeURIComponent(id)}`);

export const getConstants = () => http<ConstantsResponse>("/constants");

export const createResidualAnalysis = (payload: ResidualRequest) =>
  http<ResidualResponse>("/questionnaire/residual", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getReportUrl = (id: string) => `${API_BASE_URL}/questionnaire/report/${encodeURIComponent(id)}`;

export const getExportUrl = () => `${API_BASE_URL}/questionnaire/export`;

export const importAnalyses = (items: any[]) =>
  http<{ status: string; imported: number; total: number }>("/questionnaire/import", {
    method: "POST",
    body: JSON.stringify({ items }),
  });

// User-scoped analyses (per logged-in account)
export const listUserAnalyses = (limit = 50, offset = 0) =>
  http<UserAnalysisListResponse>(`/user/analyses?limit=${limit}&offset=${offset}`);

export type ProfileResponse = {
  profile: {
    uid: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
};

export const getProfile = () => http<ProfileResponse>("/profile");
