/**
 * Base HTTP Client for API Communications.
 * 
 * Provides unified request execution, authentication bearer token injection,
 * automatic JSON / FormData handling, and structured ApiError throwing.
 */

import { env } from '../../config/env';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = (): string => {
  if (authToken) return authToken;
  try {
    const savedRole = localStorage.getItem('seatwise_role');
    if (savedRole) {
      return `demo-token-${savedRole}`;
    }
    const savedUser = localStorage.getItem('seatwise_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed && parsed.role) {
        return `demo-token-${parsed.role}`;
      }
    }
  } catch {}
  return 'demo-token-admin';
};

export const getApiBase = () => env.apiBaseUrl;

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const base = getApiBase();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${base}${cleanEndpoint}`;

  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Ensure an Authorization Bearer header is always present, resolving to active token or demo role
  const token = authToken || getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // response wasn't JSON
    }
    const err = errorData.error || errorData;
    throw new ApiError(
      response.status,
      err.code || 'HTTP_ERROR',
      err.message || err.detail || response.statusText || 'Request failed',
      err.details
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text() as unknown as T;
}
