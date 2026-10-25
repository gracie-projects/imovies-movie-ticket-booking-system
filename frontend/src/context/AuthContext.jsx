import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api, { setUnauthorizedHandler } from '../api/client.js';
import { useToast } from './ToastContext.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useToast();
  const locationRef = useRef(location);
  const userRef = useRef(user);
  useEffect(() => {
    locationRef.current = location;
    userRef.current = user;
  });

  // Restore the session from the httpOnly cookie on first load
  useEffect(() => {
    let active = true;
    api
      .get('/auth/me')
      .then(({ data }) => active && setUser(data.user))
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler((message) => {
      if (!userRef.current) return;
      userRef.current = null;
      setUser(null);
      notify(message || 'Your session has expired. Please log in again.', 'warning');
      const { pathname, search } = locationRef.current;
      navigate(`/login?redirect=${encodeURIComponent(pathname + search)}`, { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate, notify]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, isAdmin: user?.role === 'admin', login, register, logout, setUser }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
