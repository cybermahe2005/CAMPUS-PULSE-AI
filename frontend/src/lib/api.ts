import axios, { AxiosInstance } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

let _token: string | null = null;

export function setToken(t: string | null) {
  _token = t;
  if (typeof window !== 'undefined') {
    t ? localStorage.setItem('cpa_token', t) : localStorage.removeItem('cpa_token');
  }
}
export function getToken(): string | null {
  if (_token) return _token;
  if (typeof window !== 'undefined') _token = localStorage.getItem('cpa_token');
  return _token;
}
export function clearToken() { setToken(null); }

const api: AxiosInstance = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(cfg => {
  const t = getToken();
  if (t) cfg.headers!.Authorization = `Bearer ${t}`;
  return cfg;
});
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login  = (username: string, password: string) =>
  api.post('/api/auth/login', { username, password }).then(r => r.data);
export const getMe  = () => api.get('/api/auth/me').then(r => r.data);

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboard = () => api.get('/api/dashboard/summary').then(r => r.data);

// ── Students ──────────────────────────────────────────────────────────────────
export const getStudents = (params: Record<string, any> = {}) =>
  api.get('/api/students', { params }).then(r => r.data);
export const getStudent = (id: string) =>
  api.get(`/api/students/${id}`).then(r => r.data);

// ── Predictions ───────────────────────────────────────────────────────────────
export const getPredictions = (id: string) =>
  api.get(`/api/predictions/${id}`).then(r => r.data);

// ── Simulator ─────────────────────────────────────────────────────────────────
export const runSimulation = (id: string, payload: Record<string, number>) =>
  api.post(`/api/simulator/${id}`, payload).then(r => r.data);

// ── Interventions ─────────────────────────────────────────────────────────────
export const getInterventions  = (params?: Record<string, any>) =>
  api.get('/api/interventions', { params }).then(r => r.data);
export const approveIntervention = (studentId: string, interventionId: string, notes?: string) =>
  api.post('/api/interventions/approve', { studentId, interventionId, notes }).then(r => r.data);
export const recordOutcome = (id: string, payload: any) =>
  api.post(`/api/interventions/${id}/outcome`, payload).then(r => r.data);

// ── Placement (faculty intelligence) ─────────────────────────────────────────
export const getPlacementOverview  = ()  => api.get('/api/placement/overview').then(r => r.data);
export const getPlacementStudents  = (params: Record<string,any> = {}) =>
  api.get('/api/placement/students', { params }).then(r => r.data);
export const getPlacementStudent   = (id: string) =>
  api.get(`/api/placement/students/${id}`).then(r => r.data);
export const getPlacementAnalytics = () => api.get('/api/placement/analytics').then(r => r.data);
export const matchJD = (jd_text: string, department?: string, top_n = 30) =>
  api.post('/api/placement/match-jd', { jd_text, department, top_n }).then(r => r.data);
export const getTrainings   = () => api.get('/api/placement/training').then(r => r.data);
export const createTraining = (payload: any) => api.post('/api/placement/training', payload).then(r => r.data);
export const assignTraining = (trainingId: string, studentIds: string[]) =>
  api.post('/api/placement/training/assign', { trainingId, studentIds }).then(r => r.data);
export const recordPlacementOutcome = (payload: any) =>
  api.post('/api/placement/outcomes', payload).then(r => r.data);
export const getPlacementOutcomes = (department?: string) =>
  api.get('/api/placement/outcomes', { params: department ? { department } : {} }).then(r => r.data);
export const getSkillDemand  = () => api.get('/api/placement/skill-demand').then(r => r.data);

// ── Jobs (faculty-facing CRUD — /api/jobs) ────────────────────────────────────
export const getJobs = (params: Record<string,any> = {}) =>
  api.get('/api/jobs', { params }).then(r => r.data);
export const getJob = (jobId: string) =>
  api.get(`/api/jobs/${jobId}`).then(r => r.data);
export const createJob = (payload: any) =>
  api.post('/api/jobs', payload).then(r => r.data);
export const updateJob = (jobId: string, payload: any) => // PATCH matches backend
  api.patch(`/api/jobs/${jobId}`, payload).then(r => r.data);
export const publishJob = (jobId: string) =>
  api.post(`/api/jobs/${jobId}/publish`).then(r => r.data);
export const closeJob = (jobId: string) =>
  api.post(`/api/jobs/${jobId}/close`).then(r => r.data);
export const deleteJob = (jobId: string) =>
  api.delete(`/api/jobs/${jobId}`).then(r => r.data);
export const previewJobEligibility = (jobId: string) =>
  api.post(`/api/jobs/${jobId}/preview-eligibility`, {}).then(r => r.data);
export const getJobMatches = (jobId: string, params: Record<string,any> = {}) =>
  api.get(`/api/jobs/${jobId}/matches`, { params }).then(r => r.data);
export const getJobApplications = (jobId: string) =>
  api.get(`/api/jobs/${jobId}/applications`).then(r => r.data);
export const updateApplicationStatus = (appId: string, status: string, notes?: string) =>
  api.post(`/api/jobs/applications/${appId}/status`, { status, notes }).then(r => r.data);
export const getStreams = () =>
  api.get('/api/jobs/meta/streams').then(r => r.data);
export const extractJD = (jdText: string) =>
  api.post('/api/jobs/extract-jd', { jdText }).then(r => r.data);
export const recalculateJobMatches = (jobId: string) =>
  api.post(`/api/jobs/${jobId}/recalculate`).then(r => r.data);

// ── Student Placement (self-access — /api/student/placement) ──────────────────
export const getStudentJobs = (view?: string) =>
  api.get('/api/student/placement/jobs', { params: view ? { view } : {} }).then(r => r.data);
export const getStudentJobDetail = (jobId: string) =>
  api.get(`/api/student/placement/jobs/${jobId}`).then(r => r.data);
export const applyToJob = (jobId: string, notes?: string) =>
  api.post(`/api/student/placement/apply/${jobId}`, { notes }).then(r => r.data);
export const getStudentApplications = () =>
  api.get('/api/student/placement/applications').then(r => r.data);
export const updateStudentSkills = (skills: any[]) =>
  api.put('/api/student/placement/skills', { skills }).then(r => r.data);
export const updateStudentInterests = (learningInterests: any[], preferredJobRoles?: string[]) =>
  api.put('/api/student/placement/interests', { learningInterests, preferredJobRoles }).then(r => r.data);
export const getStudentPlacementProfile = () =>
  api.get('/api/student/placement/profile').then(r => r.data);
export const getStudentReadiness = () =>
  api.get('/api/student/placement/readiness').then(r => r.data);

// ── Copilot ───────────────────────────────────────────────────────────────────
export const queryCopilot = (query: string) =>
  api.post('/api/copilot/query', { query }).then(r => r.data);

// ── Data Quality ──────────────────────────────────────────────────────────────
export const getDataQuality = () =>
  api.get('/api/data-quality').then(r => r.data);

// ── Health ────────────────────────────────────────────────────────────────────
export const healthCheck = () =>
  api.get('/health').then(r => r.data);

export default api;
