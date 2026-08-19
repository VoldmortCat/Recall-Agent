import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api';
import { getToken, setToken } from '../api/client';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    authApi.profile()
      .then((r) => setUser(r.data))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const login = async (phone, code) => {
    const r = await authApi.login(phone, code);
    if (!r?.data?.token) throw new Error(r?.message || '登录失败：后端无响应');
    setToken(r.data.token);
    setUser(r.data.user);
    return r.data;
  };
  const register = async (phone) => {
    const r = await authApi.register(phone);
    if (!r?.data?.token) throw new Error(r?.message || '注册失败：后端无响应');
    setToken(r.data.token);
    setUser(r.data.user);
    return r.data;
  };
  const logout = () => { setToken(null); setUser(null); };

  return (
    <AuthCtx.Provider value={{ user, ready, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
