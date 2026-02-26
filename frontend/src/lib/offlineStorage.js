// Offline Storage Service using IndexedDB
// This allows the POS to work completely offline

const DB_NAME = 'lumiere_pos_offline';
const DB_VERSION = 1;

const STORES = {
    menu: 'menu_items',
    tables: 'tables',
    orders: 'orders',
    pendingOrders: 'pending_orders', // Orders created offline, waiting to sync
    currencies: 'currencies',
    families: 'families',
    categories: 'categories',
    syncQueue: 'sync_queue', // Actions to sync when online
    settings: 'settings',
};

class OfflineStorage {
    constructor() {
        this.db = null;
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        
        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                if (!db.objectStoreNames.contains(STORES.menu)) {
                    db.createObjectStore(STORES.menu, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORES.tables)) {
                    db.createObjectStore(STORES.tables, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORES.orders)) {
                    const ordersStore = db.createObjectStore(STORES.orders, { keyPath: 'id' });
                    ordersStore.createIndex('status', 'status', { unique: false });
                    ordersStore.createIndex('created_at', 'created_at', { unique: false });
                }
                if (!db.objectStoreNames.contains(STORES.pendingOrders)) {
                    const pendingStore = db.createObjectStore(STORES.pendingOrders, { keyPath: 'local_id' });
                    pendingStore.createIndex('synced', 'synced', { unique: false });
                }
                if (!db.objectStoreNames.contains(STORES.currencies)) {
                    db.createObjectStore(STORES.currencies, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORES.families)) {
                    db.createObjectStore(STORES.families, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORES.categories)) {
                    db.createObjectStore(STORES.categories, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORES.syncQueue)) {
                    const syncStore = db.createObjectStore(STORES.syncQueue, { keyPath: 'id', autoIncrement: true });
                    syncStore.createIndex('synced', 'synced', { unique: false });
                }
                if (!db.objectStoreNames.contains(STORES.settings)) {
                    db.createObjectStore(STORES.settings, { keyPath: 'key' });
                }
            };
        });
    }

    handleOnline() {
        this.isOnline = true;
        console.log('🌐 Connection restored - Starting sync...');
        this.syncWithServer();
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('connectionChange', { detail: { online: true } }));
    }

    handleOffline() {
        this.isOnline = false;
        console.log('📴 Connection lost - Working offline...');
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('connectionChange', { detail: { online: false } }));
    }

    // Generic CRUD operations
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async putMany(storeName, items) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);

            items.forEach(item => store.put(item));

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Add action to sync queue
    async addToSyncQueue(action, data) {
        const queueItem = {
            action,
            data,
            timestamp: new Date().toISOString(),
            synced: false,
            retries: 0,
        };
        await this.put(STORES.syncQueue, queueItem);
        
        // Try to sync immediately if online
        if (this.isOnline) {
            this.syncWithServer();
        }
    }

    // Get pending sync items
    async getPendingSyncItems() {
        const allItems = await this.getAll(STORES.syncQueue);
        return allItems.filter(item => !item.synced);
    }

    // Sync with server
    async syncWithServer() {
        if (this.syncInProgress || !this.isOnline) return;
        
        this.syncInProgress = true;
        console.log('🔄 Syncing with server...');

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                this.syncInProgress = false;
                return;
            }

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            };

            const API_URL = process.env.REACT_APP_BACKEND_URL;

            // 1. Sync pending orders first
            const pendingOrders = await this.getAll(STORES.pendingOrders);
            const unsyncedOrders = pendingOrders.filter(o => !o.synced);

            for (const order of unsyncedOrders) {
                try {
                    const response = await fetch(`${API_URL}/api/orders`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(order.data),
                    });

                    if (response.ok) {
                        const serverOrder = await response.json();
                        // Mark as synced and store server ID
                        order.synced = true;
                        order.server_id = serverOrder.id;
                        await this.put(STORES.pendingOrders, order);
                        console.log(`✅ Order ${order.local_id} synced as ${serverOrder.order_number}`);
                    }
                } catch (err) {
                    console.error(`Failed to sync order ${order.local_id}:`, err);
                }
            }

            // 2. Process sync queue
            const syncItems = await this.getPendingSyncItems();
            for (const item of syncItems) {
                try {
                    let response;
                    switch (item.action) {
                        case 'UPDATE_ORDER_STATUS':
                            response = await fetch(`${API_URL}/api/orders/${item.data.orderId}/status?status=${item.data.status}`, {
                                method: 'PUT',
                                headers,
                            });
                            break;
                        case 'UPDATE_ITEM_STATUS':
                            response = await fetch(`${API_URL}/api/orders/${item.data.orderId}/item/${item.data.itemId}/status?status=${item.data.status}`, {
                                method: 'PUT',
                                headers,
                            });
                            break;
                        case 'CREATE_PAYMENT':
                            response = await fetch(`${API_URL}/api/payments`, {
                                method: 'POST',
                                headers,
                                body: JSON.stringify(item.data),
                            });
                            break;
                        default:
                            console.warn(`Unknown sync action: ${item.action}`);
                    }

                    if (response?.ok) {
                        item.synced = true;
                        await this.put(STORES.syncQueue, item);
                        console.log(`✅ Sync action ${item.action} completed`);
                    }
                } catch (err) {
                    item.retries++;
                    await this.put(STORES.syncQueue, item);
                    console.error(`Failed to sync action ${item.action}:`, err);
                }
            }

            // 3. Download latest data from server
            await this.downloadFromServer();

            console.log('✅ Sync completed');
            window.dispatchEvent(new CustomEvent('syncComplete'));

        } catch (err) {
            console.error('Sync error:', err);
        } finally {
            this.syncInProgress = false;
        }
    }

    // Download fresh data from server
    async downloadFromServer() {
        const token = localStorage.getItem('token');
        if (!token || !this.isOnline) return;

        const headers = {
            'Authorization': `Bearer ${token}`,
        };

        const API_URL = process.env.REACT_APP_BACKEND_URL;

        try {
            // Download menu items
            const menuRes = await fetch(`${API_URL}/api/menu`, { headers });
            if (menuRes.ok) {
                const menuItems = await menuRes.json();
                await this.clear(STORES.menu);
                await this.putMany(STORES.menu, menuItems);
            }

            // Download tables
            const tablesRes = await fetch(`${API_URL}/api/tables`, { headers });
            if (tablesRes.ok) {
                const tables = await tablesRes.json();
                await this.clear(STORES.tables);
                await this.putMany(STORES.tables, tables);
            }

            // Download currencies
            const currenciesRes = await fetch(`${API_URL}/api/currencies`, { headers });
            if (currenciesRes.ok) {
                const currencies = await currenciesRes.json();
                await this.clear(STORES.currencies);
                await this.putMany(STORES.currencies, currencies);
            }

            // Download families
            const familiesRes = await fetch(`${API_URL}/api/menu/families`, { headers });
            if (familiesRes.ok) {
                const families = await familiesRes.json();
                await this.clear(STORES.families);
                await this.putMany(STORES.families, families);
            }

            // Download active orders
            const ordersRes = await fetch(`${API_URL}/api/orders/active`, { headers });
            if (ordersRes.ok) {
                const orders = await ordersRes.json();
                await this.putMany(STORES.orders, orders);
            }

            // Save last sync time
            await this.put(STORES.settings, {
                key: 'lastSync',
                value: new Date().toISOString(),
            });

            console.log('📥 Data downloaded from server');

        } catch (err) {
            console.error('Download error:', err);
        }
    }

    // Create order offline
    async createOrderOffline(orderData) {
        const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const localOrderNumber = await this.getNextLocalOrderNumber();
        
        const offlineOrder = {
            local_id: localId,
            data: orderData,
            local_order_number: localOrderNumber,
            created_at: new Date().toISOString(),
            synced: false,
        };

        await this.put(STORES.pendingOrders, offlineOrder);

        // Also add to local orders for display
        const displayOrder = {
            id: localId,
            ...orderData,
            order_number: localOrderNumber,
            status: 'pending',
            is_offline: true,
            created_at: new Date().toISOString(),
        };
        await this.put(STORES.orders, displayOrder);

        return displayOrder;
    }

    async getNextLocalOrderNumber() {
        const setting = await this.get(STORES.settings, 'localOrderCounter');
        const current = setting?.value || 9000; // Start offline orders at 9000
        await this.put(STORES.settings, { key: 'localOrderCounter', value: current + 1 });
        return current + 1;
    }

    // Get orders (including offline ones)
    async getOrders(includeOffline = true) {
        const orders = await this.getAll(STORES.orders);
        if (includeOffline) {
            const pending = await this.getAll(STORES.pendingOrders);
            const unsyncedOrders = pending
                .filter(p => !p.synced)
                .map(p => ({
                    id: p.local_id,
                    ...p.data,
                    order_number: p.local_order_number,
                    status: 'pending',
                    is_offline: true,
                    created_at: p.created_at,
                }));
            return [...orders, ...unsyncedOrders];
        }
        return orders;
    }

    // Get sync status
    async getSyncStatus() {
        const pendingOrders = await this.getAll(STORES.pendingOrders);
        const syncQueue = await this.getAll(STORES.syncQueue);
        const lastSyncSetting = await this.get(STORES.settings, 'lastSync');

        return {
            isOnline: this.isOnline,
            pendingOrdersCount: pendingOrders.filter(o => !o.synced).length,
            pendingSyncActions: syncQueue.filter(s => !s.synced).length,
            lastSync: lastSyncSetting?.value || null,
        };
    }
}

// Create singleton instance
const offlineStorage = new OfflineStorage();

export default offlineStorage;
export { STORES };
