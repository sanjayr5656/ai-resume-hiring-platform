import { api } from './client';
import type { AppNotification, NotificationPreferences, NotificationsResponse } from '../types';

export async function getNotifications(unreadOnly = false): Promise<NotificationsResponse> {
  const { data } = await api.get<NotificationsResponse>('/api/notifications', {
    params: unreadOnly ? { unread: 'true' } : undefined,
  });
  return data;
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  const { data } = await api.patch<AppNotification>(`/api/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  const { data } = await api.patch<{ ok: boolean }>('/api/notifications/read-all');
  return data;
}

export async function updateNotificationPreferences(
  prefs: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const { data } = await api.put<NotificationPreferences>('/api/auth/preferences', prefs);
  return data;
}
