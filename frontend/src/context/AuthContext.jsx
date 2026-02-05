import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me').then(data => setUser(data.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const loginPin = async (pin) => {
    const data = await api.post('/auth/login-pin', { pin });
    setUser(data.user);
    return data.user;
  };

  const login = async (username, password) => {
    const data = await api.post('/auth/login', { username, password });
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-lg">Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, login, loginPin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
