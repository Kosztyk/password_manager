export type ApiLoginResponse = { token: string };

export type ApiRegistrationStatus = { allowRegister: boolean; userCount: number };

export type ApiRecoveryStatus = { enabled: boolean };

export type ApiUser = {
  id: string;
  email: string;
  role?: 'admin' | 'user';
  createdAt?: string;
  updatedAt?: string;
};

export type ApiIconCandidate = { url: string; source: string; slug?: string };

export type ApiVaultItem = {
  id: string;
  title: string;
  type: 'Application' | 'Server';
  category: string;
  urls: string[];
  ips: string[];
  url?: string;
  host?: string;
  credentials: { id?: string; username: string; password: string }[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  iconKind?: 'url' | 'upload' | null;
  iconUrl?: string | null;
  iconRef?: string | null;
  iconMime?: string | null;
};

const API_BASE: string = (import.meta as any).env?.VITE_API_BASE ?? '/api';

function tokenOrNull(): string | null {
  try {
    return localStorage.getItem('pm_token');
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem('pm_token', token);
    else localStorage.removeItem('pm_token');
  } catch {
    // ignore
  }
}

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenOrNull();
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data?.error || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export function register(email: string, password: string) {
  return http<ApiLoginResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function login(email: string, password: string) {
  return http<ApiLoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function registrationStatus() {
  return http<ApiRegistrationStatus>('/auth/registration-status', { method: 'GET' });
}

export function recoveryStatus() {
  return http<ApiRecoveryStatus>('/auth/recovery-status', { method: 'GET' });
}

export function recoverPassword(email: string, recoveryKey: string, newPassword: string) {
  return http<{ ok: true }>('/auth/recover', {
    method: 'POST',
    body: JSON.stringify({ email, recoveryKey, newPassword }),
  });
}

export function me() {
  return http<ApiUser>('/users/me', { method: 'GET' });
}

export async function listUsers(): Promise<ApiUser[]> {
  const r = await http<{ users: ApiUser[] }>('/users', { method: 'GET' });
  return r.users || [];
}

export function createUser(email: string, password: string) {
  return http<ApiUser>('/users', { method: 'POST', body: JSON.stringify({ email, password, role: 'user' }) });
}

export function createUserWithRole(email: string, password: string, role: 'admin' | 'user') {
  return http<ApiUser>('/users', { method: 'POST', body: JSON.stringify({ email, password, role }) });
}

export function deleteUser(id: string) {
  return http<{ id: string }>(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function updateUserRole(id: string, role: 'admin' | 'user') {
  return http<{ id: string; role: 'admin' | 'user' }>(`/users/${encodeURIComponent(id)}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export function changeMyPassword(currentPassword: string, newPassword: string) {
  return http<{ ok: true }>('/users/me/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function resetUserPassword(id: string, newPassword: string) {
  return http<{ ok: true }>(`/users/${encodeURIComponent(id)}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  });
}

export function listVault() {
  return http<ApiVaultItem[]>('/vault', { method: 'GET' });
}

export function createVault(item: Omit<ApiVaultItem, 'id' | 'createdAt' | 'updatedAt'>) {
  return http<ApiVaultItem>('/vault', { method: 'POST', body: JSON.stringify(item) });
}

export function updateVault(id: string, item: Omit<ApiVaultItem, 'id' | 'createdAt' | 'updatedAt'>) {
  return http<ApiVaultItem>(`/vault/${id}`, { method: 'PUT', body: JSON.stringify(item) });
}

export function deleteVault(id: string) {
  return http<{ id: string }>(`/vault/${id}`, { method: 'DELETE' });
}

export async function suggestIcons(title: string, url?: string): Promise<ApiIconCandidate[]> {
  const params = new URLSearchParams();
  if (title) params.set('title', title);
  if (url) params.set('url', url);
  const data = await http<{ candidates: ApiIconCandidate[] }>(`/icons/suggest?${params.toString()}`, { method: 'GET' });
  return data.candidates || [];
}

export async function uploadVaultIcon(vaultId: string, file: File): Promise<{
  id: string;
  iconKind: 'upload';
  iconUrl: null;
  iconRef: string;
  iconMime: string;
}> {
  const token = tokenOrNull();
  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const form = new FormData();
  form.append('icon', file);

  const res = await fetch(`${API_BASE}/icons/upload/${vaultId}`, { method: 'POST', headers, body: form });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data?.error || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return (await res.json()) as any;
}

export function iconFileUrl(iconRef: string): string {
  const token = tokenOrNull();
  const params = new URLSearchParams();
  if (token) params.set('token', token);
  return `${API_BASE}/icons/file/${encodeURIComponent(iconRef)}?${params.toString()}`;
}

export async function importVaultIcon(vaultId: string, url: string): Promise<{
  id: string;
  iconKind: 'upload';
  iconUrl: null;
  iconRef: string;
  iconMime: string;
}> {
  return http(`/icons/import/${vaultId}`, { method: 'POST', body: JSON.stringify({ url }) }) as any;
}
