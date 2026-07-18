import { authStorage } from './authStorage';
import { getApiUrl } from './apiUrl';

const API_URL = getApiUrl();
const HTTP_NO_CONTENT = 204;

export const AUTH_LOGOUT_EVENT = 'musichub:auth-logout';

let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const refreshToken = authStorage.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return false;

    const data = (await response.json()) as { accessToken: string; refreshToken: string };
    authStorage.setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const doFetch = () => {
    const accessToken = authStorage.getAccessToken();
    return fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init?.headers,
      },
    });
  };

  let response = await doFetch();

  if (response.status === 401 && authStorage.getRefreshToken()) {
    refreshPromise ??= refreshTokens().finally(() => {
      refreshPromise = null;
    });
    const refreshed = await refreshPromise;

    if (refreshed) {
      response = await doFetch();
    } else {
      authStorage.clear();
      window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `API request failed: ${response.status} ${response.statusText}`);
  }

  if (response.status === HTTP_NO_CONTENT) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
