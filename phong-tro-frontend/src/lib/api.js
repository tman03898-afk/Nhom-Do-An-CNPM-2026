export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * proof_url từ API thường là đường dẫn tương đối (/uploads/...).
 * File được Express phục vụ tại cùng host với API (bỏ hậu tố /api).
 */
export function resolveBackendAssetUrl(pathOrUrl) {
  if (pathOrUrl == null || pathOrUrl === '') return '';
  const s = String(pathOrUrl).trim();
  if (/^https?:\/\//i.test(s)) return s;
  const assetPath = s.replace(/^\/api(?=\/uploads\/)/i, '');

  let base = API_BASE_URL;
  if (!/^https?:\/\//i.test(base)) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    base = `${origin}${base.startsWith('/') ? '' : '/'}${base}`;
  }

  try {
    const u = new URL(base);
    const path = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
    return `${u.origin}${path}`;
  } catch {
    return assetPath;
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

  // Debug logging to help trace requests during development
  try {
    const safeHeaders = { ...finalHeaders };
    if (safeHeaders.Authorization) safeHeaders.Authorization = '<present>';
    console.debug('apiFetch ->', method, url, safeHeaders);
  } catch (e) {
    // ignore logging errors
  }

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

/** Upload ảnh phòng (admin) — trả về mảng URL tương đối /uploads/room-images/... */
export async function apiUploadRoomImages(files, { token }) {
  if (!files?.length) return [];
  const fd = new FormData();
  for (const f of files) {
    fd.append('images', f);
  }
  const url = `${API_BASE_URL}/rooms/admin/upload-images`;
  const response = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  const data = await parseJsonSafe(response);
  if (!response.ok || (data && data.ok === false)) {
    throw new Error(data?.message || `Upload failed (${response.status})`);
  }
  return data?.urls || [];
}

