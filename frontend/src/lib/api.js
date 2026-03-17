import axios from 'axios';
import offlineStorage, { STORES } from './offlineStorage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000, // 15 second timeout
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors and offline mode
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Check if it's a network error (offline)
        if (!error.response) {
            console.log('Network error detected - might be offline');
            // Don't redirect on network errors
            return Promise.reject({ ...error, isOffline: true });
        }
        
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Helper to check if online
const isOnline = () => navigator.onLine;

// Helper to get data with offline fallback
const withOfflineFallback = async (apiCall, storeName, cacheKey = null) => {
    if (isOnline()) {
        try {
            const response = await apiCall();
            // Cache the response
            if (storeName && response.data) {
                if (Array.isArray(response.data)) {
                    await offlineStorage.putMany(storeName, response.data);
                } else if (cacheKey) {
                    await offlineStorage.put(storeName, { id: cacheKey, ...response.data });
                }
            }
            return response;
        } catch (error) {
            if (error.isOffline) {
                // Fall through to offline data
                console.log(`Falling back to offline data for ${storeName}`);
            } else {
                throw error;
            }
        }
    }
    
    // Return offline data
    if (storeName) {
        const offlineData = await offlineStorage.getAll(storeName);
        return { data: offlineData, isOffline: true };
    }
    throw new Error('No offline data available');
};

// Auth API
export const authAPI = {
    login: (username, password) => api.post('/auth/login', { username, password }),
    register: (data) => api.post('/auth/register', data),
    getMe: () => api.get('/auth/me'),
};

// Users API
export const usersAPI = {
    getAll: () => api.get('/users'),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
    toggleStatus: (id) => api.put(`/users/${id}/toggle-status`),
};

// Roles API
export const rolesAPI = {
    getAll: () => api.get('/roles'),
    getPermissions: () => api.get('/permissions'),
};

// Tables API - with offline support
export const tablesAPI = {
    getAll: () => withOfflineFallback(
        () => api.get('/tables'),
        STORES.tables
    ),
    create: (data) => api.post('/tables', data),
    update: (id, data) => api.put(`/tables/${id}`, data),
    delete: (id) => api.delete(`/tables/${id}`),
};

// Menu API - with offline support
export const menuAPI = {
    getAll: () => withOfflineFallback(
        () => api.get('/menu'),
        STORES.menu
    ),
    getCategories: () => api.get('/menu/categories'),
    getFamilies: () => withOfflineFallback(
        () => api.get('/menu/families'),
        STORES.families
    ),
    getCategoriesFull: () => withOfflineFallback(
        () => api.get('/menu/categories-full'),
        STORES.categories
    ),
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

// Currency API - with offline support
export const currencyAPI = {
    getAll: () => withOfflineFallback(
        () => api.get('/currencies'),
        STORES.currencies
    ),
    getActive: async () => {
        if (isOnline()) {
            try {
                return await api.get('/currencies/active');
            } catch (error) {
                if (!error.isOffline) throw error;
            }
        }
        // Get from offline storage
        const currencies = await offlineStorage.getAll(STORES.currencies);
        const reference = currencies.find(c => c.is_reference);
        const selling = currencies.find(c => c.is_selling);
        return { data: { reference, selling }, isOffline: true };
    },
    create: (data) => api.post('/currencies', data),
    update: (id, data) => api.put(`/currencies/${id}`, data),
    delete: (id) => api.delete(`/currencies/${id}`),
    convert: (amount, from_code, to_code) => 
        api.post('/currencies/convert', null, { params: { amount, from_code, to_code } }),
};

// Orders API - with offline support
export const ordersAPI = {
    getAll: (status) => api.get('/orders', { params: { status } }),
    
    getActive: async () => {
        if (isOnline()) {
            try {
                const response = await api.get('/orders/active');
                // Cache active orders
                await offlineStorage.putMany(STORES.orders, response.data);
                return response;
            } catch (error) {
                if (!error.isOffline) throw error;
            }
        }
        // Get from offline storage including pending offline orders
        const orders = await offlineStorage.getOrders(true);
        return { data: orders, isOffline: true };
    },
    
    getByDepartment: async (department) => {
        if (isOnline()) {
            try {
                return await api.get(`/orders/department/${department}`);
            } catch (error) {
                if (!error.isOffline) throw error;
            }
        }
        // Filter offline orders by department
        const orders = await offlineStorage.getOrders(true);
        const filtered = orders.map(order => ({
            ...order,
            items: order.items?.filter(item => item.department === department) || []
        })).filter(order => order.items.length > 0);
        return { data: filtered, isOffline: true };
    },
    
    create: async (data) => {
        if (isOnline()) {
            try {
                const response = await api.post('/orders', data);
                // Also save locally
                await offlineStorage.put(STORES.orders, response.data);
                return response;
            } catch (error) {
                if (!error.isOffline) throw error;
                console.log('Online but failed to create order, falling back to offline');
            }
        }
        // Create order offline
        const offlineOrder = await offlineStorage.createOrderOffline(data);
        return { data: offlineOrder, isOffline: true };
    },
    
    addItems: async (id, items) => {
        if (isOnline()) {
            try {
                return await api.put(`/orders/${id}/items`, items);
            } catch (error) {
                if (!error.isOffline) throw error;
            }
        }
        // Queue for sync
        await offlineStorage.addToSyncQueue('ADD_ORDER_ITEMS', { orderId: id, items });
        // Update local order
        const order = await offlineStorage.get(STORES.orders, id);
        if (order) {
            order.items = [...(order.items || []), ...items.map(item => ({
                ...item,
                id: `local_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                status: 'pending'
            }))];
            await offlineStorage.put(STORES.orders, order);
            return { data: order, isOffline: true };
        }
        throw new Error('Order not found in offline storage');
    },
    
    updateStatus: async (id, status) => {
        // Update locally first for immediate feedback
        const order = await offlineStorage.get(STORES.orders, id);
        if (order) {
            order.status = status;
            await offlineStorage.put(STORES.orders, order);
        }
        
        if (isOnline()) {
            try {
                return await api.put(`/orders/${id}/status`, null, { params: { status } });
            } catch (error) {
                if (!error.isOffline) throw error;
            }
        }
        // Queue for sync
        await offlineStorage.addToSyncQueue('UPDATE_ORDER_STATUS', { orderId: id, status });
        return { data: order, isOffline: true };
    },
    
    updateItemStatus: async (orderId, itemId, status) => {
        // Update locally first
        const order = await offlineStorage.get(STORES.orders, orderId);
        if (order) {
            const item = order.items?.find(i => i.id === itemId);
            if (item) {
                item.status = status;
                await offlineStorage.put(STORES.orders, order);
            }
        }
        
        if (isOnline()) {
            try {
                return await api.put(`/orders/${orderId}/item/${itemId}/status`, null, { params: { status } });
            } catch (error) {
                if (!error.isOffline) throw error;
            }
        }
        // Queue for sync
        await offlineStorage.addToSyncQueue('UPDATE_ITEM_STATUS', { orderId, itemId, status });
        return { data: order, isOffline: true };
    },
    
    cancel: (id, reason) => api.delete(`/orders/${id}`, { params: { reason } }),
};

// Payments API
export const paymentsAPI = {
    getAll: () => api.get('/payments'),
    
    create: async (data) => {
        if (isOnline()) {
            try {
                return await api.post('/payments', data);
            } catch (error) {
                if (!error.isOffline) throw error;
            }
        }
        // Queue for sync when offline
        await offlineStorage.addToSyncQueue('CREATE_PAYMENT', data);
        return { 
            data: { 
                ...data, 
                id: `local_payment_${Date.now()}`,
                created_at: new Date().toISOString(),
                is_offline: true 
            }, 
            isOffline: true 
        };
    },
    
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
    testConnection: (id) => api.post(`/printers/${id}/test`),
    printTest: (id) => api.post(`/printers/${id}/print-test`),
};

// Print Jobs API
export const printJobsAPI = {
    getAll: (department) => api.get('/print-jobs', { params: { department } }),
    updateStatus: (id, status) => api.put(`/print-jobs/${id}/status`, null, { params: { status } }),
    executePrint: (id) => api.post(`/print-jobs/${id}/print`),
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

// Reports API
export const reportsAPI = {
    printDailyClose: (printerId) => api.post('/reports/daily-close/print', null, { 
        params: printerId ? { printer_id: printerId } : {} 
    }),
    getDailySales: (date) => api.get('/reports/daily-sales', { params: date ? { date } : {} }),
    getPeriodSales: (startDate, endDate) => api.get('/reports/period-sales', { params: { start_date: startDate, end_date: endDate } }),
    getStock: () => api.get('/reports/stock'),
};

// Order printing
export const orderPrintAPI = {
    printReceipt: (orderId, printerId) => api.post(`/orders/${orderId}/print-receipt`, null, {
        params: printerId ? { printer_id: printerId } : {}
    }),
    closeTable: (orderId, paymentMethod, loyaltyCustomerId) => api.post(`/orders/${orderId}/close-table`, null, {
        params: { payment_method: paymentMethod, loyalty_customer_id: loyaltyCustomerId || undefined }
    }),
};

// Order merge/split
export const orderSplitMergeAPI = {
    merge: (orderIds, targetTableId) => api.post('/orders/merge', { order_ids: orderIds, target_table_id: targetTableId }),
    split: (orderId, splitType, splitData) => api.post(`/orders/${orderId}/split`, { split_type: splitType, split_data: splitData }),
};

// Restaurant Settings API
export const restaurantSettingsAPI = {
    get: () => api.get('/settings/restaurant'),
    update: (data) => api.put('/settings/restaurant', data),
};

// Reservations API
export const reservationsAPI = {
    getAll: (date, status) => api.get('/reservations', { params: { date, status } }),
    create: (data) => api.post('/reservations', data),
    update: (id, data) => api.put(`/reservations/${id}`, data),
    delete: (id) => api.delete(`/reservations/${id}`),
    updateStatus: (id, status) => api.put(`/reservations/${id}/status`, null, { params: { status } }),
};

// Loyalty API
export const loyaltyAPI = {
    getSettings: () => api.get('/loyalty/settings'),
    updateSettings: (data) => api.put('/loyalty/settings', data),
    getCustomers: (search) => api.get('/loyalty/customers', { params: search ? { search } : {} }),
    createCustomer: (data) => api.post('/loyalty/customers', data),
    getCustomer: (id) => api.get(`/loyalty/customers/${id}`),
    getCustomerByPhone: (phone) => api.get(`/loyalty/customers/phone/${phone}`),
    addPoints: (customerId, amount, orderId) => api.post(`/loyalty/customers/${customerId}/add-points`, null, { params: { amount, order_id: orderId } }),
    redeemPoints: (customerId, points, rewardId) => api.post(`/loyalty/customers/${customerId}/redeem`, null, { params: { points, reward_id: rewardId } }),
    getRewards: () => api.get('/loyalty/rewards'),
    createReward: (data) => api.post('/loyalty/rewards', data),
    deleteReward: (id) => api.delete(`/loyalty/rewards/${id}`),
};

// Ingredients API
export const ingredientsAPI = {
    getAll: () => api.get('/ingredients'),
    create: (data) => api.post('/ingredients', data),
    update: (id, data) => api.put(`/ingredients/${id}`, data),
    delete: (id) => api.delete(`/ingredients/${id}`),
    adjustStock: (id, quantityChange, reason) => api.post(`/ingredients/${id}/adjust-stock`, null, { params: { quantity_change: quantityChange, reason } }),
};

// Recipes API
export const recipesAPI = {
    getAll: () => api.get('/recipes'),
    getByMenuItem: (menuItemId) => api.get(`/recipes/menu-item/${menuItemId}`),
    create: (data) => api.post('/recipes', data),
    delete: (id) => api.delete(`/recipes/${id}`),
};

// Invoices API
export const invoicesAPI = {
    get: (id) => api.get(`/invoices/${id}`),
    getByOrder: (orderId) => api.get(`/invoices/order/${orderId}`),
};

export default api;
