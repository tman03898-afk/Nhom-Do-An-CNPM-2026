import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_UNAVAILABLE_MESSAGE =
  'Khong ket noi duoc toi backend. Hay kiem tra server API co dang chay o http://localhost:5000 khong.';

async function parseJsonSafe(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch (error) {
    return null;
  }
}

function normalizeApiError(error, fallbackMessage) {
  if (error instanceof TypeError) {
    return new Error(API_UNAVAILABLE_MESSAGE);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(fallbackMessage);
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('access_token'));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error('Failed to parse user from localStorage', error);
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const hydrateMe = async () => {
      if (!token || user) {
        return;
      }

      setAuthLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await parseJsonSafe(response);
        if (!response.ok || !data?.ok) {
          throw new Error(data?.message || 'Phien dang nhap khong hop le');
        }

        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
      } catch (error) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    hydrateMe();
  }, [token, user]);

  const login = async ({ email, password }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await parseJsonSafe(response);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || 'Dang nhap that bai');
      }

      localStorage.setItem('access_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);

      return data.user;
    } catch (error) {
      throw normalizeApiError(error, 'Dang nhap that bai');
    }
  };

  const logout = async () => {
    const currentToken = token || localStorage.getItem('access_token');
    if (currentToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        });
      } catch (error) {
        // Keep client-side logout resilient even when API is down.
      }
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const currentToken = token || localStorage.getItem('access_token');
    if (!currentToken) return null;
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      const data = await parseJsonSafe(response);
      if (!response.ok || !data?.ok) return null;
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, authLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
