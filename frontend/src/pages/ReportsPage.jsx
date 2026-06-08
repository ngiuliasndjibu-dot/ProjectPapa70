import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../lib/api';
import { useCurrency } from '../contexts/CurrencyContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
    FileText, 
    Download,
    Loader2,
    Calendar,
    TrendingUp,
    Package,
    DollarSign,
    ShoppingBag,
    ChefHat,
    Wine,
    CreditCard,
    Banknote,
    Smartphone,
    Printer
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function ReportsPage() {
    const [loading, setLoading] = useState(true);
    const [reportType, setReportType] = useState('daily');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [dailyReport, setDailyReport] = useState(null);
    const [periodReport, setPeriodReport] = useState(null);
    const [stockReport, setStockReport] = useState(null);

    const { formatPriceSelling, sellingCurrency, referenceCurrency, convertSellingToReference, formatPrice } = useCurrency();

    useEffect(() => {
        loadReport();
    }, [selectedDate, startDate, endDate, reportType]);

    const loadReport = async () => {
        setLoading(true);
        try {
            if (reportType === 'daily') {
                const res = await reportsAPI.getDailySales(selectedDate);
                setDailyReport(res.data);
            } else if (reportType === 'period') {
                const res = await reportsAPI.getPeriodSales(startDate, endDate);
                setPeriodReport(res.data);
            } else if (reportType === 'stock') {
                const res = await reportsAPI.getStock();
                setStockReport(res.data);
            }
        } catch (err) {
            toast.error('Erreur lors du chargement du rapport');
        } finally {
            setLoading(false);
        }
    };

    const formatDualCurrency = (amount) => {
        const selling = formatPriceSelling(amount);
        if (referenceCurrency && sellingCurrency && referenceCurrency.code !== sellingCurrency.code) {
            const ref = formatPrice(convertSellingToReference(amount), referenceCurrency);
            return `${selling} (${ref})`;
        }
        return selling;
    };

    const printReport = () => {
        window.print();
    };

    const COLORS = ['#C2410C', '#84CC16', '#3B82F6', '#8B5CF6'];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6" data-testid="reports-page">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                        Rapports
                    </h1>
                    <p className="text-stone-500">Consultez les rapports de ventes et de stock</p>
                </div>
                <Button onClick={printReport} variant="outline" className="gap-2 print:hidden">
                    <Printer className="w-4 h-4" />
                    Imprimer
                </Button>
            </div>

            <Tabs value={reportType} onValueChange={setReportType} className="space-y-6">
                <TabsList className="print:hidden">
                    <TabsTrigger value="daily" className="gap-2">
                        <Calendar className="w-4 h-4" />
                        Rapport journalier
                    </TabsTrigger>
                    <TabsTrigger value="period" className="gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Rapport périodique
                    </TabsTrigger>
                    <TabsTrigger value="stock" className="gap-2">
                        <Package className="w-4 h-4" />
                        Rapport de stock
                    </TabsTrigger>
                </TabsList>

                {/* Daily Report */}
                <TabsContent value="daily" className="space-y-6">
                    <Card className="print:hidden">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-4">
                                <Label>Date:</Label>
                                <Input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-auto"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {dailyReport && (
                        <>
                            {/* Header for print */}
                            <div className="hidden print:block text-center mb-8">
                                <h1 className="text-2xl font-bold">RAPPORT DE CAISSE JOURNALIER</h1>
                                <p className="text-lg">{format(new Date(selectedDate), 'EEEE d MMMM yyyy', { locale: fr })}</p>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card>
                                    <CardContent className="pt-4">
                                        <div className="flex items-center gap-3">
                                            <DollarSign className="w-8 h-8 text-green-500" />
                                            <div>
                                                <p className="text-sm text-stone-500">Chiffre d&apos;affaires</p>
                                                <p className="text-xl font-bold">{formatDualCurrency(dailyReport.total_revenue)}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-4">
                                        <div className="flex items-center gap-3">
                                            <ShoppingBag className="w-8 h-8 text-blue-500" />
                                            <div>
                                                <p className="text-sm text-stone-500">Commandes</p>
                                                <p className="text-xl font-bold">{dailyReport.order_count}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-4">
                                        <div className="flex items-center gap-3">
                                            <ChefHat className="w-8 h-8 text-amber-500" />
                                            <div>
                                                <p className="text-sm text-stone-500">Cuisine</p>
                                                <p className="text-xl font-bold">{formatPriceSelling(dailyReport.by_department?.kitchen || 0)}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-4">
                                        <div className="flex items-center gap-3">
                                            <Wine className="w-8 h-8 text-purple-500" />
                                            <div>
                                                <p className="text-sm text-stone-500">Bar</p>
                                                <p className="text-xl font-bold">{formatPriceSelling(dailyReport.by_department?.bar || 0)}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Payment Methods */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Par mode de paiement</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <Banknote className="w-5 h-5 text-green-600" />
                                                    <span>Espèces</span>
                                                </div>
                                                <span className="font-bold">{formatPriceSelling(dailyReport.by_payment_method?.cash || 0)}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <CreditCard className="w-5 h-5 text-blue-600" />
                                                    <span>Carte</span>
                                                </div>
                                                <span className="font-bold">{formatPriceSelling(dailyReport.by_payment_method?.card || 0)}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <Smartphone className="w-5 h-5 text-purple-600" />
                                                    <span>Mobile Money</span>
                                                </div>
                                                <span className="font-bold">{formatPriceSelling(dailyReport.by_payment_method?.mobile_money || 0)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Hourly Chart */}
                                <Card className="print:hidden">
                                    <CardHeader>
                                        <CardTitle>Ventes par heure</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div style={{ width: '100%', height: 200 }}>
                                            <ResponsiveContainer>
                                                <AreaChart data={dailyReport.hourly_sales}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} />
                                                    <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                                                    <Tooltip formatter={(v) => formatPriceSelling(v)} />
                                                    <Area type="monotone" dataKey="amount" fill="#C2410C" fillOpacity={0.3} stroke="#C2410C" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Top Items */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Top 10 produits vendus</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>#</TableHead>
                                                <TableHead>Produit</TableHead>
                                                <TableHead className="text-right">Quantité</TableHead>
                                                <TableHead className="text-right">Chiffre d&apos;affaires</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {dailyReport.top_items?.map((item, index) => (
                                                <TableRow key={item.name}>
                                                    <TableCell>{index + 1}</TableCell>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {formatPriceSelling(item.revenue)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                {/* Period Report */}
                <TabsContent value="period" className="space-y-6">
                    <Card className="print:hidden">
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-4">
                                <Label>Du:</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-auto"
                                />
                                <Label>Au:</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-auto"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {periodReport && (
                        <>
                            <div className="hidden print:block text-center mb-8">
                                <h1 className="text-2xl font-bold">RAPPORT DE VENTES</h1>
                                <p className="text-lg">
                                    Du {format(new Date(startDate), 'd MMMM yyyy', { locale: fr })} au {format(new Date(endDate), 'd MMMM yyyy', { locale: fr })}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Card>
                                    <CardContent className="pt-4">
                                        <p className="text-sm text-stone-500">Total période</p>
                                        <p className="text-2xl font-bold">{formatDualCurrency(periodReport.total_revenue)}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-4">
                                        <p className="text-sm text-stone-500">Nombre de commandes</p>
                                        <p className="text-2xl font-bold">{periodReport.total_orders}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Daily Chart */}
                            <Card className="print:hidden">
                                <CardHeader>
                                    <CardTitle>Évolution des ventes</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div style={{ width: '100%', height: 300 }}>
                                        <ResponsiveContainer>
                                            <BarChart data={periodReport.daily_breakdown}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), 'dd/MM')} />
                                                <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                                                <Tooltip 
                                                    formatter={(v) => formatPriceSelling(v)}
                                                    labelFormatter={(d) => format(new Date(d), 'dd/MM/yyyy')}
                                                />
                                                <Bar dataKey="revenue" fill="#C2410C" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Daily Table */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Détail par jour</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead className="text-right">Commandes</TableHead>
                                                <TableHead className="text-right">Chiffre d&apos;affaires</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {periodReport.daily_breakdown?.map((day) => (
                                                <TableRow key={day.date}>
                                                    <TableCell>{format(new Date(day.date), 'EEEE d MMMM', { locale: fr })}</TableCell>
                                                    <TableCell className="text-right">{day.orders}</TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {formatPriceSelling(day.revenue)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                {/* Stock Report */}
                <TabsContent value="stock" className="space-y-6">
                    {stockReport && (
                        <>
                            <div className="hidden print:block text-center mb-8">
                                <h1 className="text-2xl font-bold">RAPPORT DE STOCK</h1>
                                <p className="text-lg">{format(new Date(), 'd MMMM yyyy', { locale: fr })}</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Card>
                                    <CardContent className="pt-4">
                                        <p className="text-sm text-stone-500">Articles en stock</p>
                                        <p className="text-2xl font-bold">{stockReport.stock_items?.length || 0}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-4">
                                        <p className="text-sm text-stone-500">Ingrédients</p>
                                        <p className="text-2xl font-bold">{stockReport.ingredients?.length || 0}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-4">
                                        <p className="text-sm text-stone-500">Bouteilles</p>
                                        <p className="text-2xl font-bold">{stockReport.bottles?.length || 0}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-amber-200 bg-amber-50">
                                    <CardContent className="pt-4">
                                        <p className="text-sm text-amber-700">Alertes</p>
                                        <p className="text-2xl font-bold text-amber-700">
                                            {(stockReport.stock_alerts?.length || 0) + 
                                             (stockReport.ingredient_alerts?.length || 0) + 
                                             (stockReport.bottle_alerts?.length || 0)}
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Stock Alerts */}
                            {(stockReport.stock_alerts?.length > 0 || stockReport.ingredient_alerts?.length > 0 || stockReport.bottle_alerts?.length > 0) && (
                                <Card className="border-amber-200">
                                    <CardHeader>
                                        <CardTitle className="text-amber-700">Alertes de stock bas</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Article</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead className="text-right">Stock actuel</TableHead>
                                                    <TableHead className="text-right">Seuil</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {stockReport.stock_alerts?.map((item) => (
                                                    <TableRow key={item.id} className="bg-amber-50">
                                                        <TableCell className="font-medium">{item.name}</TableCell>
                                                        <TableCell><Badge variant="outline">Stock</Badge></TableCell>
                                                        <TableCell className="text-right text-red-600">{item.quantity} {item.unit}</TableCell>
                                                        <TableCell className="text-right">{item.alert_threshold} {item.unit}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {stockReport.ingredient_alerts?.map((item) => (
                                                    <TableRow key={item.id} className="bg-amber-50">
                                                        <TableCell className="font-medium">{item.name}</TableCell>
                                                        <TableCell><Badge variant="outline">Ingrédient</Badge></TableCell>
                                                        <TableCell className="text-right text-red-600">{item.quantity_in_stock} {item.unit}</TableCell>
                                                        <TableCell className="text-right">{item.alert_threshold} {item.unit}</TableCell>
                                                    </TableRow>
                                                ))}
                                                {stockReport.bottle_alerts?.map((item) => (
                                                    <TableRow key={item.id} className="bg-amber-50">
                                                        <TableCell className="font-medium">{item.name}</TableCell>
                                                        <TableCell><Badge variant="outline">Bouteille</Badge></TableCell>
                                                        <TableCell className="text-right text-red-600">{item.quantity_in_stock}</TableCell>
                                                        <TableCell className="text-right">{item.alert_threshold}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Full Ingredients List */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Liste des ingrédients</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nom</TableHead>
                                                <TableHead className="text-right">Stock</TableHead>
                                                <TableHead className="text-right">Coût unitaire</TableHead>
                                                <TableHead className="text-right">Valeur totale</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {stockReport.ingredients?.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell className="text-right">{item.quantity_in_stock} {item.unit}</TableCell>
                                                    <TableCell className="text-right">{formatPriceSelling(item.cost_per_unit)}</TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {formatPriceSelling(item.quantity_in_stock * item.cost_per_unit)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>
            </Tabs>

            {/* Print Styles */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    [data-testid="reports-page"], [data-testid="reports-page"] * {
                        visibility: visible;
                    }
                    [data-testid="reports-page"] {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .print\\:block {
                        display: block !important;
                    }
                }
            `}</style>
        </div>
    );
}
