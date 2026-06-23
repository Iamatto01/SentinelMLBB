import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is in localStorage on mount
    const storedUser = localStorage.getItem('sentinel_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email) => {
    setLoading(true);
    try {
      const GAS_URL = import.meta.env.VITE_GAS_WEB_APP_URL;
      const res = await fetch(`${GAS_URL}?action=login&email=${encodeURIComponent(email)}`);
      const result = await res.json();

      if (result.status === "success") {
        const isAdmin = result.role === 'admin';
        const userData = {
          email: email,
          name: isAdmin ? "SaaS Admin" : "Squad Member",
          picture: `https://ui-avatars.com/api/?name=${isAdmin ? "Admin" : "User"}&background=e94560&color=fff`,
          role: result.role,
          sheetId: result.sheetId
        };
        setUser(userData);
        localStorage.setItem('sentinel_user', JSON.stringify(userData));
        return { success: true };
      } else {
        return { success: false, message: result.message };
      }
    } catch (err) {
      console.error(err);
      return { success: false, message: "Network error connecting to API." };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sentinel_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
