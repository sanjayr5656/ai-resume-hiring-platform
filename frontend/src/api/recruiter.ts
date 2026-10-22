import { api, API_BASE_URL, getStoredToken } from './client';
import type {
  Application,
  CreateJobPayload,
  DuplicatesResponse,
  Job,
  SkillsExtractionResponse,
  TopSummaryResponse,
  UpdateJobPayload,
} from '../types';

export async function getRecruiterJobs(): Promise<Job[]> {
  const { data } = await api.get<Job[]>('/api/recruiter/jobs');
  return data;
}

export async function createJob(payload: CreateJobPayload): Promise<Job> {
  const { data } = await api.post<Job>('/api/jobs', payload);
  return data;
}

export async function updateJob(id: string, payload: UpdateJobPayload): Promise<Job> {
  const { data } = await api.put<Job>(`/api/jobs/${id}`, payload);
  return data;
}

export async function closeJob(id: string): Promise<Job> {
  const { data } = await api.post<Job>(`/api/jobs/${id}/close`);
  return data;
}

export async function extractSkillsWithAi(title: string, description: string): Promise<SkillsExtractionResponse> {
  const { data } = await api.post<SkillsExtractionResponse>('/api/recruiter/extract-skills', {
    title,
    description,
  });
  return data;
}

export interface ApplicantsFilter {
  status?: 'applied' | 'shortlisted' | 'rejected';
  minScore?: number;
  onlyVerified?: boolean;
}

export async function getJobApplicants(jobId: string, filter?: ApplicantsFilter): Promise<Application[]> {
  const { data } = await api.get<Application[]>(`/api/recruiter/jobs/${jobId}/applicants`, {
    params: filter,
  });
  return data;
}

export async function getTopSummary(jobId: string): Promise<TopSummaryResponse> {
  const { data } = await api.get<TopSummaryResponse>(`/api/recruiter/jobs/${jobId}/top-summary`);
  return data;
}

export async function updateApplicationStatus(
  applicationId: string,
  status: 'shortlisted' | 'rejected' | 'applied'
): Promise<Application> {
  const { data } = await api.patch<Application>(`/api/recruiter/applications/${applicationId}/status`, {
    status,
  });
  return data;
}

export async function runAiCheck(applicationId: string, certId: string): Promise<Application> {
  const { data } = await api.post<Application>(
    `/api/recruiter/applications/${applicationId}/certifications/${certId}/ai-check`
  );
  return data;
}

export async function verifyCertification(
  applicationId: string,
  certId: string,
  status: 'verified' | 'rejected',
  note?: string
): Promise<Application> {
  const { data } = await api.patch<Application>(
    `/api/recruiter/applications/${applicationId}/certifications/${certId}/verify`,
    { status, note }
  );
  return data;
}

export async function detectDuplicates(jobId: string): Promise<DuplicatesResponse> {
  const { data } = await api.post<DuplicatesResponse>(`/api/recruiter/jobs/${jobId}/duplicates`);
  return data;
}

export function getCandidateResumeUrl(applicationId: string): string {
  const token = getStoredToken() || '';
  return `${API_BASE_URL}/api/recruiter/applications/${applicationId}/resume?token=${encodeURIComponent(token)}`;
}

export async function getApplicationDetail(applicationId: string): Promise<Application> {
  const { data } = await api.get<Application>(`/api/recruiter/applications/${applicationId}`);
  return data;
}

export async function refreshApplicantStats(applicationId: string): Promise<{
  applicationSnapshot: Application['profileSnapshot'];
  latestSnapshot: Application['profileSnapshot'];
  refreshedAt: string;
}> {
  const { data } = await api.post<{
    applicationSnapshot: Application['profileSnapshot'];
    latestSnapshot: Application['profileSnapshot'];
    refreshedAt: string;
  }>(`/api/recruiter/applications/${applicationId}/refresh-stats`);
  return data;
}
