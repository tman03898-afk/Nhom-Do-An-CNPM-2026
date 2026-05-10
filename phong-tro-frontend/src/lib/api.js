export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * proof_url từ API thường là đường dẫn tương đối (/uploads/...).
 * File được Express phục vụ tại cùng host với API (bỏ hậu tố /api).
 */
export function resolveBackendAssetUrl(pathOrUrl) {
  if (pathOrUrl == null || pathOrUrl === '') return '';
  const s = String(pathOrUrl).trim();
  if (/^https?:\/\//i.test(s)) return s;

  let base = API_BASE_URL;
  if (!/^https?:\/\//i.test(base)) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    base = `${origin}${base.startsWith('/') ? '' : '/'}${base}`;
  }

  try {
    const u = new URL(base);
    const path = s.startsWith('/') ? s : `/${s}`;
    return `${u.origin}${path}`;
  } catch {
    return s;
  }
}

async function parseJsonSafe(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { ok: false, message: text || 'Invalid JSON response' };
  }
}

export async function apiFetch(path, { token, method = 'GET', headers, body } = {}) {
  const url = `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const finalHeaders = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers || {}),
  };

  const response = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await parseJsonSafe(response);
  if (!response.ok || (data && data.ok === false)) {
    const message = data?.message || `Request failed (${response.status})`;
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

