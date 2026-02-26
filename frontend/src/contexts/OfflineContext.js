import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import offlineStorage from '../lib/offlineStorage';
import { menuAPI, tablesAPI, ordersAPI, currencyAPI } from '../lib/api';
import { toast } from 'sonner';

const OfflineContext = createContext(null);

export const useOffline = () => {
    const context = useContext(OfflineContext);
    if (!context) {
        throw new Error('useOffline must be used within an OfflineProvider');
    }
    return context;
};

export const OfflineProvider = ({ children }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isInitialized, setIsInitialized] = useState(false);
    const [syncStatus, setSyncStatus] = useState({
        pendingOrdersCount: 0,
        pendingSyncActions: 0,
        lastSync: null,
    });
    const [isSyncing, setIsSyncing] = useState(false);

    // Initialize offline storage
    useEffect(() => {
        const init = async () => {
            try {
                await offlineStorage.init();
                setIsInitialized(true);
                
                // Initial data download if online
                if (navigator.onLine) {
                    await offlineStorage.downloadFromServer();
                }
                
                updateSyncStatus();
            } catch (err) {
                console.error('Failed to initialize offline storage:', err);
            }
        };
        init();
    }, []);

    // Listen for connection changes
    useEffect(() => {
        const handleConnectionChange = (event) => {
            setIsOnline(event.detail.online);
            if (event.detail.online) {
                toast.success('🌐 Connexion rétablie', {
                    description: 'Synchronisation en cours...',
                });
            } else {
                toast.warning('📴 Mode hors ligne', {
                    description: 'Les données seront synchronisées quand la connexion reviendra.',
                });
            }
        };

        const handleSyncComplete = () => {
            updateSyncStatus();
            setIsSyncing(false);
            toast.success('✅ Synchronisation terminée');
        };

        window.addEventListener('connectionChange', handleConnectionChange);
        window.addEventListener('syncComplete', handleSyncComplete);

        return () => {
            window.removeEventListener('connectionChange', handleConnectionChange);
            window.removeEventListener('syncComplete', handleSyncComplete);
        };
    }, []);

    const updateSyncStatus = async () => {
        if (!isInitialized) return;
        const status = await offlineStorage.getSyncStatus();
        setSyncStatus(status);
    };

    // Get menu items (from local storage or API)
    const getMenuItems = useCallback(async () => {
        if (!isInitialized) return [];
        
        if (isOnline) {
            try {
                const response = await menuAPI.getAll();
                // Update local storage
                await offlineStorage.putMany('menu_items', response.data);
                return response.data;
            } catch (err) {
                console.log('Falling back to offline data for menu');
            }
        }
        
        return await offlineStorage.getAll('menu_items');
    }, [isOnline, isInitialized]);

    // Get tables (from local storage or API)
    const getTables = useCallback(async () => {
        if (!isInitialized) return [];
        
        if (isOnline) {
            try {
                const response = await tablesAPI.getAll();
                await offlineStorage.putMany('tables', response.data);
                return response.data;
            } catch (err) {
                console.log('Falling back to offline data for tables');
            }
        }
        
        return await offlineStorage.getAll('tables');
    }, [isOnline, isInitialized]);

    // Get currencies
    const getCurrencies = useCallback(async () => {
        if (!isInitialized) return [];
        
        if (isOnline) {
            try {
                const response = await currencyAPI.getAll();
                await offlineStorage.putMany('currencies', response.data);
                return response.data;
            } catch (err) {
                console.log('Falling back to offline data for currencies');
            }
        }
        
        return await offlineStorage.getAll('currencies');
    }, [isOnline, isInitialized]);

    // Create order (works offline)
    const createOrder = useCallback(async (orderData) => {
        if (!isInitialized) throw new Error('Offline storage not initialized');
        
        if (isOnline) {
            try {
                const response = await ordersAPI.create(orderData);
                // Also save locally
                await offlineStorage.put('orders', response.data);
                return response.data;
            } catch (err) {
                console.log('Network error, creating order offline');
            }
        }
        
        // Create offline order
        const offlineOrder = await offlineStorage.createOrderOffline(orderData);
        toast.info('📴 Commande créée hors ligne', {
            description: `N° ${offlineOrder.order_number} - Sera synchronisée automatiquement`,
        });
        updateSyncStatus();
        return offlineOrder;
    }, [isOnline, isInitialized]);

    // Get orders (including offline ones)
    const getOrders = useCallback(async () => {
        if (!isInitialized) return [];
        
        if (isOnline) {
            try {
                const response = await ordersAPI.getActive();
                await offlineStorage.putMany('orders', response.data);
                // Merge with pending offline orders
                const allOrders = await offlineStorage.getOrders(true);
                return allOrders;
            } catch (err) {
                console.log('Falling back to offline orders');
            }
        }
        
        return await offlineStorage.getOrders(true);
    }, [isOnline, isInitialized]);

    // Update order status (works offline)
    const updateOrderStatus = useCallback(async (orderId, status) => {
        if (!isInitialized) return;
        
        // Update locally first
        const order = await offlineStorage.get('orders', orderId);
        if (order) {
            order.status = status;
            await offlineStorage.put('orders', order);
        }
        
        if (isOnline) {
            try {
                await ordersAPI.updateStatus(orderId, status);
                return;
            } catch (err) {
                console.log('Queueing status update for sync');
            }
        }
        
        // Queue for later sync
        await offlineStorage.addToSyncQueue('UPDATE_ORDER_STATUS', { orderId, status });
        updateSyncStatus();
    }, [isOnline, isInitialized]);

    // Update item status (works offline)
    const updateItemStatus = useCallback(async (orderId, itemId, status) => {
        if (!isInitialized) return;
        
        // Update locally first
        const order = await offlineStorage.get('orders', orderId);
        if (order) {
            const item = order.items?.find(i => i.id === itemId);
            if (item) {
                item.status = status;
                await offlineStorage.put('orders', order);
            }
        }
        
        if (isOnline) {
            try {
                await ordersAPI.updateItemStatus(orderId, itemId, status);
                return;
            } catch (err) {
                console.log('Queueing item status update for sync');
            }
        }
        
        // Queue for later sync
        await offlineStorage.addToSyncQueue('UPDATE_ITEM_STATUS', { orderId, itemId, status });
        updateSyncStatus();
    }, [isOnline, isInitialized]);

    // Force sync
    const forceSync = useCallback(async () => {
        if (!isOnline) {
            toast.error('Pas de connexion internet');
            return;
        }
        
        setIsSyncing(true);
        await offlineStorage.syncWithServer();
    }, [isOnline]);

    // Download fresh data
    const downloadData = useCallback(async () => {
        if (!isOnline) {
            toast.error('Pas de connexion internet');
            return;
        }
        
        setIsSyncing(true);
        await offlineStorage.downloadFromServer();
        setIsSyncing(false);
        updateSyncStatus();
        toast.success('Données téléchargées');
    }, [isOnline]);

    const value = {
        isOnline,
        isInitialized,
        syncStatus,
        isSyncing,
        getMenuItems,
        getTables,
        getCurrencies,
        createOrder,
        getOrders,
        updateOrderStatus,
        updateItemStatus,
        forceSync,
        downloadData,
    };

    return (
        <OfflineContext.Provider value={value}>
            {children}
        </OfflineContext.Provider>
    );
};
