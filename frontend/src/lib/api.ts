import type { ApiError } from '../types/api';

const BASE_URL = '/api/v1';

function getToken(): string | null {
  return sessionStorage.getItem('lf_token') || localStorage.getItem('lf_token');
}

export function setToken(token: string): void {
  sessionStorage.setItem('lf_token', token);
}

export function clearToken(): void {
  sessionStorage.removeItem('lf_token');
  localStorage.removeItem('lf_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    let error: ApiError;
    try {
      error = await res.json();
    } catch {
      error = { code: 'UNKNOWN', status: res.status, detail: res.statusText };
    }
    throw error;
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
