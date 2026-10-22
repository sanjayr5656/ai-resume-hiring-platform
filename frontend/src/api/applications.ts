import { api, API_BASE_URL, getStoredToken } from './client';
import type { Application } from '../types';

export interface AddCertificationPayload {
  name: string;
  issuer?: string;
  credentialId?: string;
  credentialUrl?: string;
  proofs?: File[];
}

export async function addCertification(applicationId: string, payload: AddCertificationPayload): Promise<Application> {
  const formData = new FormData();
  formData.append('name', payload.name);
  if (payload.issuer) formData.append('issuer', payload.issuer);
  if (payload.credentialId) formData.append('credentialId', payload.credentialId);
  if (payload.credentialUrl) formData.append('credentialUrl', payload.credentialUrl);
  if (payload.proofs && payload.proofs.length > 0) {
    for (const file of payload.proofs) {
      formData.append('proofs', file);
    }
  }

  const { data } = await api.post<Application>(`/api/jobs/applications/${applicationId}/certifications`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteCertification(applicationId: string, certificationId: string): Promise<Application> {
  const { data } = await api.delete<Application>(
    `/api/jobs/applications/${applicationId}/certifications/${certificationId}`
  );
  return data;
}

export async function uploadProof(
  applicationId: string,
  certificationId: string,
  payload: { proofs?: File[]; credentialId?: string; credentialUrl?: string }
): Promise<Application> {
  const formData = new FormData();
  if (payload.credentialId !== undefined) formData.append('credentialId', payload.credentialId);
  if (payload.credentialUrl !== undefined) formData.append('credentialUrl', payload.credentialUrl);
  if (payload.proofs && payload.proofs.length > 0) {
    for (const file of payload.proofs) {
      formData.append('proofs', file);
    }
  }

  const { data } = await api.post<Application>(
    `/api/jobs/applications/${applicationId}/certifications/${certificationId}/proof`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

export async function deleteProofFile(
  applicationId: string,
  certificationId: string,
  fileId: string
): Promise<Application> {
  const { data } = await api.delete<Application>(
    `/api/jobs/applications/${applicationId}/certifications/${certificationId}/proofs/${fileId}`
  );
  return data;
}

/**
 * Fetch proof document bytes with Bearer token and return a revocable Object URL
 */
export async function fetchProofBlobUrl(
  applicationId: string,
  certificationId: string,
  fileId: string
): Promise<{ url: string; mimeType: string }> {
  const response = await api.get(
    `/api/jobs/applications/${applicationId}/certifications/${certificationId}/proofs/${fileId}`,
    { responseType: 'blob' }
  );
  const mimeType = String(response.headers['content-type'] || 'application/pdf');
  const blob = new Blob([response.data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  return { url, mimeType };
}

export function getProofDirectUrl(applicationId: string, certificationId: string, fileId: string): string {
  const token = getStoredToken() || '';
  return `${API_BASE_URL}/api/jobs/applications/${applicationId}/certifications/${certificationId}/proofs/${fileId}?token=${encodeURIComponent(token)}`;
}
