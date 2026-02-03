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
  AnalysisProject,
  CreateProjectRequest,
  AddRiskRequest,
  UpdateRiskMitigationRequest,
  ProjectSummaryListResponse,
  RiskItem,
} from "./types";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeader = await getAuthHeader();
  const needsAuth = path.startsWith("/profile") || path.startsWith("/user/") || path.startsWith("/projects");
  
  console.log(`[API] Calling ${path}`, {
    hasAuth: !!authHeader?.Authorization,
    authPreview: authHeader?.Authorization ? authHeader.Authorization.substring(0, 30) + '...' : 'none'
  });
  
  if (needsAuth && !authHeader?.Authorization) {
    console.error(`[API] Missing Authorization header for protected path: ${path}`);
  }
  
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(init?.headers || {}),
    },
  });
  
  console.log(`[API] Response for ${path}:`, res.status, res.statusText);
  
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

// Export comparison as Word document (.docx)
export const exportCompareReport = async (payload: CompareRequest) => {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/compare/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  const cd = res.headers.get("Content-Disposition") || "";
  let filename = "compare_report.docx";
  const m = cd.match(/filename=([^;]+)/);
  if (m) filename = m[1].replace(/(^\"|\"$)/g, "");
  const data = await res.blob();
  return { data, filename };
};

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

// Get a single user analysis by ID
export const getUserAnalysis = (id: string) =>
  http<QuestionnaireAnalyzeResponse>(`/user/analyses/${encodeURIComponent(id)}`);

// Delete a user analysis by ID
export const deleteUserAnalysis = async (id: string) => {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/user/analyses/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      ...authHeader,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
};

export type ProfileResponse = {
  profile: {
    uid: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
};

export type ExtendedProfileResponse = {
  profile: {
    uid: string;
    email?: string;
    nom?: string;
    prenom?: string;
    fonction?: string;
    entreprise?: string;
    created_at?: string;
    updated_at?: string;
  };
};

export type CompleteProfileRequest = {
  nom: string;
  prenom: string;
  fonction: string;
  entreprise: string;
};

export const getProfile = () => http<ProfileResponse>("/profile");

export const getExtendedProfile = () => http<ExtendedProfileResponse>("/user/profile/extended");

export const completeProfile = (data: CompleteProfileRequest) =>
  http<{ status: string; message: string; profile: any }>("/user/profile/complete", {
    method: "POST",
    body: JSON.stringify(data),
  });

// Project-based analysis API
export const createProject = (data: CreateProjectRequest) =>
  http<AnalysisProject>("/projects/", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const listProjects = (limit = 50, offset = 0) =>
  http<ProjectSummaryListResponse>(`/projects/?limit=${limit}&offset=${offset}`);

export const getProject = (projectId: string) =>
  http<AnalysisProject>(`/projects/${encodeURIComponent(projectId)}`);

export const addRiskToProject = (data: AddRiskRequest) =>
  http<RiskItem>(`/projects/${encodeURIComponent(data.project_id)}/risks`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateRiskMitigation = (data: UpdateRiskMitigationRequest) =>
  http<RiskItem>(`/projects/${encodeURIComponent(data.project_id)}/risks/${encodeURIComponent(data.risk_id)}/mitigation`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteProject = async (projectId: string) => {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/projects/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
    headers: {
      ...authHeader,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
};

export const deleteRiskFromProject = async (projectId: string, riskId: string) => {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}/projects/${encodeURIComponent(projectId)}/risks/${encodeURIComponent(riskId)}`, {
    method: "DELETE",
    headers: {
      ...authHeader,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
};

// Mettre à jour un projet existant
export const updateProject = (projectId: string, data: Partial<CreateProjectRequest>) =>
  http<AnalysisProject>(`/projects/${encodeURIComponent(projectId)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

// Dupliquer un projet
export const duplicateProject = (projectId: string, newTitle?: string) =>
  http<AnalysisProject>(`/projects/${encodeURIComponent(projectId)}/duplicate`, {
    method: "POST",
    body: JSON.stringify({ new_title: newTitle }),
  });

// Lancer une analyse IA comparative pour un projet
export const analyzeProjectWithIA = async (projectId: string) => {
  return http<{
    project_id: string;
    comparisons: Array<{
      risk_id: string;
      risk_description: string;
      human_analysis: {
        G: number; F: number; P: number; score: number; classification: string;
      };
      ia_analysis: {
        G: number; F: number; P: number; score: number; classification: string;
        causes?: string[]; recommendations?: string[]; justification?: string;
      };
      comparison: {
        agreement_level?: string;
        classifications_match?: boolean;
      };
    }>;
  }>(`/projects/${encodeURIComponent(projectId)}/ai-analysis`, {
    method: "POST",
  });
};
