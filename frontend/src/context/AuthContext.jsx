import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const AuthContext = createContext();

export default AuthContext;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authTokens, setAuthTokens] = useState(() => localStorage.getItem('authTokens') ? JSON.parse(localStorage.getItem('authTokens')) : null);
  const navigate = useNavigate();

  const loginUser = async (email, password) => {
    try {
      const response = await api.post('/auth/login/', { email, password });
      if (response.status === 200) {
        setAuthTokens(response.data);
        localStorage.setItem('authTokens', JSON.stringify(response.data));
        // Fetch user details after successful login
        const userResponse = await api.get('/auth/user/', {
          headers: {
            Authorization: `Bearer ${response.data.access}`
          }
        });
        setUser(userResponse.data);
        navigate('/');
      }
    } catch (error) {
      console.error('Login failed:', error);
      // Handle login error (e.g., show an error message)
    }
  };

  const registerUser = async (email, password, password2) => {
    try {
      const response = await api.post('/auth/register/', { email, password, password2 });
      if (response.status === 201) {
        // Automatically log in the user after successful registration
        await loginUser(email, password);
      }
    } catch (error) {
      console.error('Registration failed:', error);
      // Handle registration error
    }
  };

  const logoutUser = () => {
    setAuthTokens(null);
    setUser(null);
    localStorage.removeItem('authTokens');
    navigate('/login');
  };

  useEffect(() => {
    const fetchUser = async () => {
      if (authTokens) {
        try {
          const userResponse = await api.get('/auth/user/', {
            headers: {
              Authorization: `Bearer ${authTokens.access}`
            }
          });
          setUser(userResponse.data);
        } catch (error) {
          // Token might be expired or invalid
          logoutUser();
        }
      }
    };
    fetchUser();
  }, [authTokens]);

  const contextData = {
    user,
    loginUser,
    registerUser,
    logoutUser,
    authTokens
  };

  return (
    <AuthContext.Provider value={contextData}>
      {children}
    </AuthContext.Provider>
  );
};
