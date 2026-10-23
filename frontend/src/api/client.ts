import axios, { type AxiosError } from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3000');

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getStoredToken = (): string | null => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

export const clearStoredAuth = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  delete api.defaults.headers.common.Authorization;
};

// Inject Bearer token
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global 401 & error interceptor
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; code?: string }>) => {
    const isAuthRoute = /\/api\/auth\/(login|register)/.test(error.config?.url || '');
    const code = error.response?.data?.code;
    const isExpired = code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN' || code === 'SESSION_EXPIRED' || code === 'NO_TOKEN';

    if (error.response?.status === 401 && !isAuthRoute && (isExpired || getStoredToken())) {
      clearStoredAuth();
      window.dispatchEvent(
        new CustomEvent('hirelens:session-expired', {
          detail: { message: error.response?.data?.error || 'Session expired. Please sign in again.' },
        })
      );
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
