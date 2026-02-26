import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (username, password) => api.post('/auth/login', { username, password }),
    register: (data) => api.post('/auth/register', data),
    getMe: () => api.get('/auth/me'),
};

// Users API
export const usersAPI = {
    getAll: () => api.get('/users'),
    update: (id, data) => api.put(`/users/${id}`, data),
};

// Tables API
export const tablesAPI = {
    getAll: () => api.get('/tables'),
    create: (data) => api.post('/tables', data),
    update: (id, data) => api.put(`/tables/${id}`, data),
    delete: (id) => api.delete(`/tables/${id}`),
};

// Menu API
export const menuAPI = {
    getAll: () => api.get('/menu'),
    getCategories: () => api.get('/menu/categories'),
    getFamilies: () => api.get('/menu/families'),
    getCategoriesFull: () => api.get('/menu/categories-full'),
    create: (data) => api.post('/menu', data),
    update: (id, data) => api.put(`/menu/${id}`, data),
    delete: (id) => api.delete(`/menu/${id}`),
    createFamily: (data) => api.post('/menu/families', data),
    updateFamily: (id, data) => api.put(`/menu/families/${id}`, data),
    deleteFamily: (id) => api.delete(`/menu/families/${id}`),
    createCategory: (data) => api.post('/menu/categories-full', data),
    updateCategory: (id, data) => api.put(`/menu/categories-full/${id}`, data),
    deleteCategory: (id) => api.delete(`/menu/categories-full/${id}`),
};

// Currency API
export const currencyAPI = {
    getAll: () => api.get('/currencies'),
    getActive: () => api.get('/currencies/active'),
    create: (data) => api.post('/currencies', data),
    update: (id, data) => api.put(`/currencies/${id}`, data),
    delete: (id) => api.delete(`/currencies/${id}`),
    convert: (amount, from_code, to_code) => 
        api.post('/currencies/convert', null, { params: { amount, from_code, to_code } }),
};

// Orders API
export const ordersAPI = {
    getAll: (status) => api.get('/orders', { params: { status } }),
    getActive: () => api.get('/orders/active'),
    getByDepartment: (department) => api.get(`/orders/department/${department}`),
    create: (data) => api.post('/orders', data),
    addItems: (id, items) => api.put(`/orders/${id}/items`, items),
    updateStatus: (id, status) => api.put(`/orders/${id}/status`, null, { params: { status } }),
    updateItemStatus: (orderId, itemId, status) => api.put(`/orders/${orderId}/item/${itemId}/status`, null, { params: { status } }),
    cancel: (id, reason) => api.delete(`/orders/${id}`, { params: { reason } }),
};

// Payments API
export const paymentsAPI = {
    getAll: () => api.get('/payments'),
    create: (data) => api.post('/payments', data),
    getDailyClose: () => api.get('/payments/daily-close'),
};

// Stock API
export const stockAPI = {
    getAll: () => api.get('/stock'),
    create: (data) => api.post('/stock', data),
    update: (id, data) => api.put(`/stock/${id}`, data),
    recordMovement: (id, quantity_change, reason) => 
        api.post(`/stock/${id}/movement`, null, { params: { quantity_change, reason } }),
    getAlerts: () => api.get('/stock/alerts'),
};

// Bottles API
export const bottlesAPI = {
    getAll: () => api.get('/bottles'),
    create: (data) => api.post('/bottles', data),
    update: (id, data) => api.put(`/bottles/${id}`, data),
    pour: (id, volume_ml) => api.post(`/bottles/${id}/pour`, null, { params: { volume_ml } }),
    getReport: () => api.get('/bottles/report'),
    getAlerts: () => api.get('/bottles/alerts'),
};

// Printers API
export const printersAPI = {
    getAll: () => api.get('/printers'),
    create: (data) => api.post('/printers', data),
    update: (id, data) => api.put(`/printers/${id}`, data),
    delete: (id) => api.delete(`/printers/${id}`),
};

// Print Jobs API
export const printJobsAPI = {
    getAll: (department) => api.get('/print-jobs', { params: { department } }),
    updateStatus: (id, status) => api.put(`/print-jobs/${id}/status`, null, { params: { status } }),
};

// Dashboard API
export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats'),
    getHourlySales: () => api.get('/dashboard/hourly-sales'),
};

// Seed API
export const seedAPI = {
    seed: () => api.post('/seed'),
};

export default api;
