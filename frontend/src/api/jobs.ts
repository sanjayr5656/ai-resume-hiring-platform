import { api, API_BASE_URL, getStoredToken } from './client';
import type { Application, Job } from '../types';

export async function getJobs(search?: string): Promise<Job[]> {
  const { data } = await api.get<Job[]>('/api/jobs', {
    params: search ? { search } : undefined,
  });
  return data;
}

export async function getJobById(id: string): Promise<Job> {
  const { data } = await api.get<Job>(`/api/jobs/${id}`);
  return data;
}

export async function applyToJob(jobId: string, resumeFile: File): Promise<Application> {
  const formData = new FormData();
  formData.append('resume', resumeFile);
  const { data } = await api.post<Application>(`/api/jobs/${jobId}/apply`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
}

export async function getMyApplications(): Promise<Application[]> {
  const { data } = await api.get<Application[]>('/api/jobs/my/applications');
  return data;
}

export function getMyResumeUrl(applicationId: string): string {
  const token = getStoredToken() || '';
  return `${API_BASE_URL}/api/jobs/my/applications/${applicationId}/resume?token=${encodeURIComponent(token)}`;
}
