import { api } from './client';
import type { CodingStats, ManualStatsOverride, UserProfile } from '../types';

export interface AddLinkPayload {
  platform: string;
  username?: string;
  url?: string;
  headline?: string;
  currentRole?: string;
  skills?: string[];
}

export async function getProfile(): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>('/api/profile');
  return data;
}

export async function addProfileLink(payload: AddLinkPayload): Promise<UserProfile> {
  const { data } = await api.post<UserProfile>('/api/profile/links', payload);
  return data;
}

export async function updateProfileLink(platform: string, payload: Partial<AddLinkPayload>): Promise<UserProfile> {
  const { data } = await api.put<UserProfile>(`/api/profile/links/${platform}`, payload);
  return data;
}

export async function deleteProfileLink(platform: string): Promise<UserProfile> {
  const { data } = await api.delete<UserProfile>(`/api/profile/links/${platform}`);
  return data;
}

export async function getCodingStats(): Promise<CodingStats[]> {
  const { data } = await api.get<CodingStats[]>('/api/profile/coding-stats');
  return data;
}

export async function refreshPlatformStats(platform: string): Promise<CodingStats> {
  const { data } = await api.post<CodingStats>(`/api/profile/coding-stats/${platform}/refresh`);
  return data;
}

export async function submitManualStats(platform: string, payload: Partial<ManualStatsOverride>): Promise<CodingStats> {
  const { data } = await api.put<CodingStats>(`/api/profile/coding-stats/${platform}/manual`, payload);
  return data;
}
