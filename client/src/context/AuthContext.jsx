import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('freshbite_token') || '');

  useEffect(() => {
    const savedUser = localStorage.getItem('freshbite_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

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