import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../lib/api';
import { useCurrency } from '../contexts/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
    DollarSign, 
    ShoppingBag, 
    ChefHat, 
    Wine, 
    TrendingUp,
    AlertTriangle,
    Package,
    Beaker,
    Loader2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function DashboardPage() {
    const [stats, setStats] = useState(null);
    const [hourlySales, setHourlySales] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const { 
        sellingCurrency, 
        referenceCurrency, 
        formatPriceSelling,
        convertSellingToReference,
        formatPrice,
        loading: currencyLoading 
    } = useCurrency();

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const [statsRes, hourlyRes] = await Promise.all([
                dashboardAPI.getStats(),
                dashboardAPI.getHourlySales()
            ]);
            setStats(statsRes.data);
            setHourlySales(hourlyRes.data);
        } catch (err) {
            console.error('Error loading dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    // Format price with both currencies
    const formatDualCurrency = (amount) => {
        const sellingFormatted = formatPriceSelling(amount);
        
        // Show reference currency equivalent if different
        if (referenceCurrency && sellingCurrency && referenceCurrency.code !== sellingCurrency.code) {
            const refAmount = convertSellingToReference(amount);
            const refFormatted = formatPrice(refAmount, referenceCurrency);
            return (
                <span>
                    {sellingFormatted}
                    <span className="text-sm text-stone-400 ml-1">({refFormatted})</span>
                </span>
            );
        }
        return sellingFormatted;
    };

    // Format for tooltip (single line)
    const formatTooltipValue = (value) => {
        const selling = formatPriceSelling(value);
        if (referenceCurrency && sellingCurrency && referenceCurrency.code !== sellingCurrency.code) {
            const refAmount = convertSellingToReference(value);
            const ref = formatPrice(refAmount, referenceCurrency);
            return `${selling} (${ref})`;
        }
        return selling;
    };

    if (loading || currencyLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const pieData = [
        { name: 'Cuisine', value: stats?.kitchen_sales || 0, color: '#C2410C' },
        { name: 'Bar', value: stats?.bar_sales || 0, color: '#84CC16' },
    ];

    return (
        <div className="p-6 lg:p-8 space-y-8" data-testid="dashboard-page">
            {/* Header */}
            <div>
                <h1 className="text-3xl lg:text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Tableau de bord
                </h1>
                <p className="text-stone-500 mt-1">
                    Vue d'ensemble de votre activité
                    {sellingCurrency && referenceCurrency && sellingCurrency.code !== referenceCurrency.code && (
                        <span className="ml-2 text-xs">
                            (Devise: {sellingCurrency.symbol} / Réf: {referenceCurrency.symbol})
                        </span>
                    )}
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                <Card className="border-stone-100 shadow-sm card-hover" data-testid="stat-revenue">
                    <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-stone-500 font-medium">Chiffre du jour</p>
                                <p className="text-2xl lg:text-3xl font-bold text-stone-900 mt-1">
                                    {formatDualCurrency(stats?.daily_revenue || 0)}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-stone-100 shadow-sm card-hover" data-testid="stat-orders">
                    <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-stone-500 font-medium">Commandes</p>
                                <p className="text-2xl lg:text-3xl font-bold text-stone-900 mt-1">
                                    {stats?.total_orders || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                <ShoppingBag className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-stone-100 shadow-sm card-hover" data-testid="stat-kitchen">
                    <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-stone-500 font-medium">Ventes Cuisine</p>
                                <p className="text-2xl lg:text-3xl font-bold text-stone-900 mt-1">
                                    {formatDualCurrency(stats?.kitchen_sales || 0)}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                                <ChefHat className="w-6 h-6 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-stone-100 shadow-sm card-hover" data-testid="stat-bar">
                    <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-stone-500 font-medium">Ventes Bar</p>
                                <p className="text-2xl lg:text-3xl font-bold text-stone-900 mt-1">
                                    {formatDualCurrency(stats?.bar_sales || 0)}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                                <Wine className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Hourly Sales Chart */}
                <Card className="lg:col-span-2 border-stone-100 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                            <TrendingUp className="w-5 h-5 text-primary" />
                            Ventes par heure
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={hourlySales}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                    <XAxis 
                                        dataKey="hour" 
                                        tickFormatter={(h) => `${h}h`}
                                        stroke="#78716C"
                                        fontSize={12}
                                    />
                                    <YAxis 
                                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                        stroke="#78716C"
                                        fontSize={12}
                                    />
                                    <Tooltip 
                                        formatter={(value) => [formatTooltipValue(value), 'Ventes']}
                                        labelFormatter={(h) => `${h}h00`}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="sales" 
                                        stroke="#C2410C" 
                                        fill="#C2410C"
                                        fillOpacity={0.2}
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Department Split */}
                <Card className="border-stone-100 shadow-sm">
                    <CardHeader>
                        <CardTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                            Répartition des ventes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div style={{ width: '100%', height: 200 }}>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatTooltipValue(value)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-6 mt-4">
                            {pieData.map((item) => (
                                <div key={item.name} className="flex items-center gap-2">
                                    <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className="text-sm text-stone-600">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Products */}
                <Card className="border-stone-100 shadow-sm">
                    <CardHeader>
                        <CardTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                            Top produits
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats?.top_items?.slice(0, 5).map((item, index) => (
                                <div key={item.name} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                                            {index + 1}
                                        </span>
                                        <span className="font-medium text-stone-800">{item.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-stone-900">{formatDualCurrency(item.revenue)}</p>
                                        <p className="text-xs text-stone-500">{item.quantity} vendus</p>
                                    </div>
                                </div>
                            )) || (
                                <p className="text-stone-500 text-center py-4">Aucune vente aujourd'hui</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Alerts */}
                <Card className="border-stone-100 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Alertes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats?.stock_alerts?.map((alert) => (
                                <div key={alert.id} className="flex items-center justify-between py-2 px-3 bg-amber-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Package className="w-4 h-4 text-amber-600" />
                                        <span className="font-medium text-amber-900">{alert.name}</span>
                                    </div>
                                    <Badge variant="outline" className="border-amber-300 text-amber-700">
                                        Stock bas: {alert.quantity} {alert.unit}
                                    </Badge>
                                </div>
                            ))}
                            {stats?.bottle_alerts?.map((alert) => (
                                <div key={alert.id} className="flex items-center justify-between py-2 px-3 bg-red-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Beaker className="w-4 h-4 text-red-600" />
                                        <span className="font-medium text-red-900">{alert.name}</span>
                                    </div>
                                    <Badge variant="outline" className="border-red-300 text-red-700">
                                        Stock bas: {alert.quantity_in_stock}
                                    </Badge>
                                </div>
                            ))}
                            {(!stats?.stock_alerts?.length && !stats?.bottle_alerts?.length) && (
                                <p className="text-stone-500 text-center py-4">Aucune alerte</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
