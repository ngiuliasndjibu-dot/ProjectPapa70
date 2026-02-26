import React, { useState, useEffect } from 'react';
import { ordersAPI } from '../lib/api';
import { cn, formatTime, getTimeElapsed, getUrgencyLevel, getUrgencyColor, getStatusLabel, getOrderStatusBadge } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { toast } from 'sonner';
import { 
    Clock, 
    CheckCircle, 
    ChefHat,
    Loader2,
    RefreshCw,
    User,
    Table2
} from 'lucide-react';

export default function KitchenPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOrders();
        const interval = setInterval(loadOrders, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const loadOrders = async () => {
        try {
            const response = await ordersAPI.getByDepartment('kitchen');
            setOrders(response.data);
        } catch (err) {
            console.error('Error loading kitchen orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateItemStatus = async (orderId, itemId, status) => {
        try {
            await ordersAPI.updateItemStatus(orderId, itemId, status);
            toast.success(`Article marqué comme ${getStatusLabel(status)}`);
            loadOrders();
        } catch (err) {
            toast.error('Erreur lors de la mise à jour');
        }
    };

    const markOrderReady = async (orderId) => {
        try {
            // Mark all items as ready
            const order = orders.find(o => o.id === orderId);
            for (const item of order.items) {
                if (item.status !== 'ready') {
                    await ordersAPI.updateItemStatus(orderId, item.id, 'ready');
                }
            }
            toast.success('Commande prête!');
            loadOrders();
        } catch (err) {
            toast.error('Erreur lors de la mise à jour');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-stone-100">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-100 p-4" data-testid="kitchen-page">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
                        <ChefHat className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                            Cuisine
                        </h1>
                        <p className="text-stone-500 text-sm">{orders.length} commande(s) en attente</p>
                    </div>
                </div>
                <Button variant="outline" onClick={loadOrders} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Actualiser
                </Button>
            </div>

            {/* Orders Grid */}
            {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-stone-500">
                    <ChefHat className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg">Aucune commande en attente</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {orders.map((order) => {
                        const urgency = getUrgencyLevel(order.created_at);
                        return (
                            <Card 
                                key={order.id} 
                                className={cn(
                                    'border-l-4 shadow-sm',
                                    urgency === 'urgent' && 'border-l-red-500 animate-pulse-slow',
                                    urgency === 'warning' && 'border-l-amber-500',
                                    urgency === 'normal' && 'border-l-green-500'
                                )}
                                data-testid={`kitchen-order-${order.order_number}`}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-bold">#{order.order_number}</span>
                                            <Badge className={getUrgencyColor(urgency)}>
                                                <Clock className="w-3 h-3 mr-1" />
                                                {getTimeElapsed(order.created_at)}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-stone-500">
                                        <span className="flex items-center gap-1">
                                            <Table2 className="w-4 h-4" />
                                            Table {order.table_number}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <User className="w-4 h-4" />
                                            {order.server_name}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 mb-4">
                                        {order.items.map((item) => (
                                            <div 
                                                key={item.id}
                                                className={cn(
                                                    'flex items-center justify-between p-2 rounded-lg',
                                                    item.status === 'ready' && 'bg-green-50 line-through opacity-60',
                                                    item.status === 'preparing' && 'bg-blue-50',
                                                    item.status === 'pending' && 'bg-stone-50'
                                                )}
                                            >
                                                <div className="flex-1">
                                                    <span className="font-medium">
                                                        {item.quantity}x {item.menu_item_name}
                                                    </span>
                                                    {item.notes && (
                                                        <p className="text-xs text-amber-600 mt-1">
                                                            Note: {item.notes}
                                                        </p>
                                                    )}
                                                </div>
                                                {item.status !== 'ready' && (
                                                    <button
                                                        onClick={() => updateItemStatus(order.id, item.id, item.status === 'pending' ? 'preparing' : 'ready')}
                                                        className={cn(
                                                            'p-2 rounded-lg transition-colors',
                                                            item.status === 'pending' && 'bg-amber-100 text-amber-700 hover:bg-amber-200',
                                                            item.status === 'preparing' && 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        )}
                                                    >
                                                        {item.status === 'pending' ? 'Préparer' : 'Prêt'}
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {order.notes && (
                                        <div className="bg-amber-50 text-amber-800 p-2 rounded-lg text-sm mb-4">
                                            Note: {order.notes}
                                        </div>
                                    )}

                                    <Button 
                                        onClick={() => markOrderReady(order.id)}
                                        className="w-full h-12 rounded-full btn-press bg-green-600 hover:bg-green-700"
                                        disabled={order.items.every(i => i.status === 'ready')}
                                    >
                                        <CheckCircle className="w-5 h-5 mr-2" />
                                        Commande prête
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
