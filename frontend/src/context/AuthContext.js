import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Setup axios interceptor to add token to all requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await axios.get(`${API_URL}/api/auth/me`);
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('auth_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (identifier, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, { identifier, password });
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
      }
      setUser(response.data);
      return { success: true, ...response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Erreur de connexion' 
      };
    }
  };

  const register = async (data) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, data);
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
      }
      setUser(response.data);
      return { success: true, ...response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Erreur lors de l\'inscription' 
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/api/auth/logout`);
    } catch (error) {
      // ignore
    }
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';

  const value = { user, login, register, logout, isAuthenticated, isAdmin, loading, checkAuth };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
