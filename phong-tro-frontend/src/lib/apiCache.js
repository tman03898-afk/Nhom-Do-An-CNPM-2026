import { apiFetch } from './api';

const store = new Map();

function cacheKey(method, token, path) {
  const tokenPart = token ? String(token).slice(-16) : 'anon';
  return `${method}:${tokenPart}:${path}`;
}

/**
 * GET có cache ngắn — giảm chờ khi chuyển trang / layout refetch.
 * POST/PUT/PATCH/DELETE luôn gọi trực tiếp.
 */
export function cachedApiFetch(path, options = {}, ttlMs = 45_000) {
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    return apiFetch(path, options);
  }

  const key = cacheKey(method, options.token, path);
  const now = Date.now();
  const hit = store.get(key);

  if (hit?.data != null && now - hit.time < ttlMs) {
    return Promise.resolve(hit.data);
  }
  if (hit?.promise) {
    return hit.promise;
  }

  const promise = apiFetch(path, options)
    .then((data) => {
      store.set(key, { data, time: Date.now() });
      return data;
    })
    .catch((err) => {
      store.delete(key);
      throw err;
    });

  store.set(key, { promise, time: 0 });
  return promise;
}

/** Xóa cache theo chuỗi con trong path (vd. '/tenant/notifications'). */
export function invalidateApiCache(match = '') {
  if (!match) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.includes(match)) store.delete(key);
  }
}

export function clearApiCache() {
  store.clear();
}
