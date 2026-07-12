import axios from 'axios';

export const api = axios.create({
    // Vite uses import.meta.env instead of process.env
    baseURL: import.meta.env.VITE_API_URL, 
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach the auth token to every request if the admin is logged in
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('emberz_admin_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});