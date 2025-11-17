import axios from 'axios';

const axiosClient = axios.create({
    baseURL: '/api'
});

axiosClient.interceptors.request.use(
    (config) => {
        // Exceções para rotas de autenticação que não precisam de token
        if (config.url.includes('/auth/login/') || config.url.includes('/auth/registration/')) {
            return config;
        }

        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default axiosClient;
