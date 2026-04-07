import { createContext, useState, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); 

  const login = (role) => {
    if (role === 'admin') {
      setUser({ id: 1, name: 'Admin Tester', role: 'ADMIN' });
    } else {
      setUser({ id: 2, name: 'Tenant Tester', role: 'TENANT' });
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
