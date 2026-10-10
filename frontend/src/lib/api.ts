const API_BASE = '/api/v1';

export class ApiError extends Error {
  code: string;
  status: number;
  fieldErrors: Record<string, string[]>;
  data?: any;

  constructor(status: number, message: string, code = 'error', fieldErrors = {}, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.data = data;
  }
}

export const getAccessToken = () => localStorage.getItem('projectflow_access_token');
export const getRefreshToken = () => localStorage.getItem('projectflow_refresh_token');

export const setTokens = (access: string, refresh?: string) => {
  localStorage.setItem('projectflow_access_token', access);
  if (refresh) {
    localStorage.setItem('projectflow_refresh_token', refresh);
  }
};

export const clearTokens = () => {
  localStorage.removeItem('projectflow_access_token');
  localStorage.removeItem('projectflow_refresh_token');
  localStorage.removeItem('projectflow_active_workspace');
};

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') || endpoint.startsWith('/api') ? endpoint : `${API_BASE}${endpoint}`;
  const token = getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(url, { ...options, headers });

  // Handle Token Refresh on 401
  if (response.status === 401 && !endpoint.includes('/auth/token')) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            setTokens(data.access, data.refresh);
            processQueue(null, data.access);
            headers['Authorization'] = `Bearer ${data.access}`;
            response = await fetch(url, { ...options, headers });
          } else {
            clearTokens();
            processQueue(new Error('Session expired'), null);
            window.location.href = '/login';
          }
        } catch (err) {
          clearTokens();
          processQueue(err, null);
          window.location.href = '/login';
        } finally {
          isRefreshing = false;
        }
      } else {
        await new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });
        headers['Authorization'] = `Bearer ${getAccessToken()}`;
        response = await fetch(url, { ...options, headers });
      }
    }
  }

  if (response.status === 204) {
    return {} as T;
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const errObj = data?.error || {};
    const message = errObj.message || data.detail || response.statusText || 'Request failed';
    const code = errObj.code || (response.status === 409 ? 'conflict' : 'error');
    const fieldErrors = errObj.field_errors || {};
    const currentData = errObj.data;
    throw new ApiError(response.status, message, code, fieldErrors, currentData);
  }

  return data as T;
}
