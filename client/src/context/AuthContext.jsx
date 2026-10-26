import React, { createContext, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('freshbite_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(localStorage.getItem('freshbite_token') || '');

  const loginUser = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('freshbite_user', JSON.stringify(userData));
    localStorage.setItem('freshbite_token', userToken);
  };

  const logoutUser = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('freshbite_user');
    localStorage.removeItem('freshbite_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login: loginUser, logout: logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};
