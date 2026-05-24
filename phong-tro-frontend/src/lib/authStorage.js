const KEYS = {
  token: 'access_token',
  user: 'user',
  remember: 'remember_login',
  email: 'remembered_email',
  password: 'remembered_password',
};

function parseUser(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Đọc phiên đăng nhập (ưu tiên session rồi local). */
export function readAuthSession() {
  const sessionToken = sessionStorage.getItem(KEYS.token);
  if (sessionToken) {
    return {
      token: sessionToken,
      user: parseUser(sessionStorage.getItem(KEYS.user)),
      remember: false,
    };
  }

  const localToken = localStorage.getItem(KEYS.token);
  if (localToken) {
    return {
      token: localToken,
      user: parseUser(localStorage.getItem(KEYS.user)),
      remember: localStorage.getItem(KEYS.remember) === '1',
    };
  }

  return { token: null, user: null, remember: localStorage.getItem(KEYS.remember) === '1' };
}

export function readRememberedEmail() {
  return readRememberedCredentials().email;
}

/** Email + mật khẩu đã lưu (chỉ khi bật ghi nhớ). Mật khẩu lưu local — máy dùng chung có rủi ro. */
export function readRememberedCredentials() {
  if (localStorage.getItem(KEYS.remember) !== '1') {
    return { email: '', password: '' };
  }
  return {
    email: localStorage.getItem(KEYS.email) || '',
    password: localStorage.getItem(KEYS.password) || '',
  };
}

export function clearRememberedCredentials() {
  localStorage.removeItem(KEYS.email);
  localStorage.removeItem(KEYS.password);
}

export function isRememberLoginEnabled() {
  const v = localStorage.getItem(KEYS.remember);
  if (v === null) return true;
  return v === '1';
}

/** Lưu token/user; remember=true → localStorage, false → sessionStorage. */
export function persistAuthSession({ token, user, remember, email, password }) {
  localStorage.removeItem(KEYS.token);
  localStorage.removeItem(KEYS.user);
  sessionStorage.removeItem(KEYS.token);
  sessionStorage.removeItem(KEYS.user);

  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(KEYS.token, token);
  storage.setItem(KEYS.user, JSON.stringify(user));

  if (remember) {
    localStorage.setItem(KEYS.remember, '1');
    if (email) {
      localStorage.setItem(KEYS.email, String(email).trim().toLowerCase());
    }
    if (password != null && String(password).length > 0) {
      localStorage.setItem(KEYS.password, String(password));
    }
  } else {
    localStorage.setItem(KEYS.remember, '0');
    clearRememberedCredentials();
  }
}

export function clearAuthSession({ keepRememberedCredentials = false } = {}) {
  localStorage.removeItem(KEYS.token);
  localStorage.removeItem(KEYS.user);
  sessionStorage.removeItem(KEYS.token);
  sessionStorage.removeItem(KEYS.user);

  if (!keepRememberedCredentials) {
    localStorage.removeItem(KEYS.remember);
    clearRememberedCredentials();
  }
}

export function getActiveToken(fallbackToken) {
  return (
    fallbackToken ||
    sessionStorage.getItem(KEYS.token) ||
    localStorage.getItem(KEYS.token) ||
    null
  );
}

export function patchStoredUser(user, rememberHint) {
  const remember =
    rememberHint ?? (localStorage.getItem(KEYS.remember) === '1' && !!localStorage.getItem(KEYS.token));
  const storage = remember ? localStorage : sessionStorage;
  if (!storage.getItem(KEYS.token)) return;
  storage.setItem(KEYS.user, JSON.stringify(user));
}
