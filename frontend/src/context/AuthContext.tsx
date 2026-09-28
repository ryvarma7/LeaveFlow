import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { api, setToken, clearToken } from '../lib/api';
import type { LoginRequest, LoginResponse, UserProfile } from '../types/api';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (req: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = sessionStorage.getItem('lf_token');
    const raw = sessionStorage.getItem('lf_user');
    const user = raw ? (JSON.parse(raw) as UserProfile) : null;
    return { token, user, isAuthenticated: !!(token && user) };
  });

  const login = useCallback(async (req: LoginRequest) => {
    const res = await api.post<LoginResponse>('/auth/login', req);
    setToken(res.token);
    // Fetch full profile
    sessionStorage.setItem('lf_token', res.token);
    const profile = await api.get<UserProfile>('/auth/me');
    sessionStorage.setItem('lf_user', JSON.stringify(profile));
    setState({ token: res.token, user: profile, isAuthenticated: true });
  }, []);

  const logout = useCallback(() => {
    clearToken();
    sessionStorage.removeItem('lf_user');
    setState({ token: null, user: null, isAuthenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
