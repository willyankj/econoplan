import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('authToken') || null);
    const navigate = useNavigate();

    useEffect(() => {
        const storedToken = localStorage.getItem('authToken');
        if (storedToken) {
            setToken(storedToken);
            // Fetch user data if token exists, to keep user session alive
            axiosClient.get('/auth/user/')
                .then(response => {
                    setUser(response.data);
                })
                .catch(() => {
                    // Token is invalid or expired
                    logout();
                });
        }
    }, []);

    const login = async (email, password) => {
        try {
            const response = await axiosClient.post('/auth/login/', { email, password });
            const { access: accessToken } = response.data;

            localStorage.setItem('authToken', accessToken);
            setToken(accessToken);

            // Fetch user details after setting the token
            const userResponse = await axiosClient.get('/auth/user/');
            setUser(userResponse.data);

            navigate('/');
        } catch (error) {
            console.error('Login failed:', error);
            // Re-throw the error to be caught by the calling component (e.g., LoginPage)
            throw error;
        }
    };

    const register = async (userData) => {
        try {
            // dj-rest-auth registration endpoint returns the user and token directly
            // so we can log them in right away.
            await axiosClient.post('/auth/registration/', userData);
            // After successful registration, log the user in
            await login(userData.email, userData.password);

        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('authToken');
        setUser(null);
        setToken(null);
        navigate('/login');
    };

    const isAuthenticated = !!token;

    const value = {
        user,
        token,
        isAuthenticated,
        login,
        register,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
    return useContext(AuthContext);
};
