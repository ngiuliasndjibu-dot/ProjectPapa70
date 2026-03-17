import React, { useState, useEffect } from 'react';
import { ordersAPI, paymentsAPI } from '../lib/api';
import { formatDate, getStatusLabel, getOrderStatusBadge } from '../lib/utils';
import { useCurrency } from '../contexts/CurrencyContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { 
    CreditCard,
    Banknote,
    Smartphone,
    Loader2,
    Search,
    Receipt,
    DollarSign,
    CheckCircle,
    ArrowRightLeft
} from 'lucide-react';

export default function PaymentsPage() {
    const [orders, setOrders] = useState([]);
    const [payments, setPayments] = useState([]);
    const [dailyClose, setDailyClose] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [paymentData, setPaymentData] = useState({
        amount: 0,
        amountInCurrency: 0,
        method: 'cash',
        is_partial: false,
        currency: null
    });

    const { 
        referenceCurrency, 
        sellingCurrency, 
        paymentCurrencies,
        formatPrice,
        formatPriceSelling,
        formatPriceReference,
        convertToSelling,
        convertToReference,
        convert,
        getPriceForPayment,
        loading: currencyLoading 
    } = useCurrency();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [ordersRes, paymentsRes, closeRes] = await Promise.all([
                ordersAPI.getAll(),
                paymentsAPI.getAll(),
                paymentsAPI.getDailyClose()
            ]);
            setOrders(ordersRes.data.filter(o => o.status !== 'cancelled'));
            setPayments(paymentsRes.data);
            setDailyClose(closeRes.data);
        } catch (err) {
            toast.error('Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    };

    const openPaymentDialog = (order) => {
        // Calculate remaining amount (in selling currency - prices are stored in selling currency)
        const orderPayments = payments.filter(p => p.order_id === order.id);
        const paidAmount = orderPayments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = order.total - paidAmount;
        
        // Default to selling currency
        const defaultCurrency = sellingCurrency || referenceCurrency;
        
        // If paying in reference currency, convert the amount
        const amountInCurrency = defaultCurrency?.code === referenceCurrency?.code 
            ? getPriceForPayment(remaining, referenceCurrency)
            : remaining;
        
        setSelectedOrder(order);
        setPaymentData({
            amount: remaining, // Store in selling currency
            amountInCurrency: amountInCurrency,
            method: 'cash',
            is_partial: false,
            currency: defaultCurrency
        });
        setIsPaymentDialogOpen(true);
    };

    const handleCurrencyChange = (currencyCode) => {
        const currency = paymentCurrencies.find(c => c.code === currencyCode);
        if (!currency) return;

        const orderPayments = payments.filter(p => p.order_id === selectedOrder.id);
        const paidAmount = orderPayments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = selectedOrder.total - paidAmount;

        // Convert remaining to selected currency
        const amountInCurrency = currency.code === sellingCurrency?.code 
            ? remaining 
            : getPriceForPayment(remaining, currency);

        setPaymentData(prev => ({
            ...prev,
            currency,
            amountInCurrency
        }));
    };

    const handleAmountChange = (value) => {
        const amountInCurrency = parseFloat(value) || 0;
        
        // Convert back to selling currency for storage
        let amountInSelling;
        if (paymentData.currency?.code === sellingCurrency?.code) {
            amountInSelling = amountInCurrency;
        } else {
            // Convert from payment currency to selling currency
            amountInSelling = convert(amountInCurrency, paymentData.currency?.code, sellingCurrency?.code);
        }

        const orderPayments = payments.filter(p => p.order_id === selectedOrder.id);
        const paidAmount = orderPayments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = selectedOrder.total - paidAmount;

        setPaymentData(prev => ({
            ...prev,
            amountInCurrency,
            amount: amountInSelling,
            is_partial: amountInSelling < remaining
        }));
    };

    const handlePayment = async () => {
        try {
            await paymentsAPI.create({
                order_id: selectedOrder.id,
                amount: paymentData.amount, // Amount in reference currency
                amount_selling: paymentData.amountInCurrency,
                currency_code: paymentData.currency?.code || referenceCurrency?.code,
                method: paymentData.method,
                is_partial: paymentData.is_partial,
            });
            toast.success('Paiement enregistré');
            setIsPaymentDialogOpen(false);
            loadData();
        } catch (err) {
            toast.error('Erreur lors du paiement');
        }
    };

    const getOrderPaidAmount = (orderId) => {
        return payments
            .filter(p => p.order_id === orderId)
            .reduce((sum, p) => sum + p.amount, 0);
    };

    const pendingOrders = orders.filter(o => {
        const paid = getOrderPaidAmount(o.id);
        return paid < o.total && o.status !== 'cancelled';
    });

    const filteredOrders = pendingOrders.filter(order =>
        order.order_number.toString().includes(searchQuery) ||
        order.table_number.toString().includes(searchQuery)
    );

    const getMethodIcon = (method) => {
        switch (method) {
            case 'cash': return <Banknote className="w-4 h-4" />;
            case 'card': return <CreditCard className="w-4 h-4" />;
            case 'mobile_money': return <Smartphone className="w-4 h-4" />;
            default: return <DollarSign className="w-4 h-4" />;
        }
    };

    const getMethodLabel = (method) => {
        switch (method) {
            case 'cash': return 'Espèces';
            case 'card': return 'Carte';
            case 'mobile_money': return 'Mobile Money';
            default: return method;
        }
    };

    if (loading || currencyLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8" data-testid="payments-page">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                        Paiements
                    </h1>
                    <p className="text-stone-500 mt-1">
                        {pendingOrders.length} commande(s) en attente de paiement
                        {sellingCurrency && referenceCurrency && sellingCurrency.code !== referenceCurrency.code && (
                            <span className="ml-2 text-xs text-primary">
                                (Affichage en {sellingCurrency.symbol})
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {/* Daily Close Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="border-stone-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-stone-500">Total du jour</p>
                                <p className="text-2xl font-bold">{formatPriceSelling(dailyClose?.total || 0)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-stone-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                                <Banknote className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-sm text-stone-500">Espèces</p>
                                <p className="text-2xl font-bold">{formatPriceSelling(dailyClose?.by_method?.cash || 0)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-stone-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                <CreditCard className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-stone-500">Carte</p>
                                <p className="text-2xl font-bold">{formatPriceSelling(dailyClose?.by_method?.card || 0)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-stone-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                                <Smartphone className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-stone-500">Mobile Money</p>
                                <p className="text-2xl font-bold">{formatPriceSelling(dailyClose?.by_method?.mobile_money || 0)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-md mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input
                    placeholder="Rechercher par n° commande ou table..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Pending Orders Table */}
            <Card className="border-stone-100 shadow-sm">
                <CardHeader>
                    <CardTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                        Commandes en attente de paiement
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>N° Commande</TableHead>
                                <TableHead>Table</TableHead>
                                <TableHead>Serveur</TableHead>
                                <TableHead>Heure</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Payé</TableHead>
                                <TableHead className="text-right">Reste</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredOrders.map((order) => {
                                const paidAmount = getOrderPaidAmount(order.id);
                                const remaining = order.total - paidAmount;
                                return (
                                    <TableRow key={order.id}>
                                        <TableCell>
                                            <span className="font-bold">#{order.order_number}</span>
                                        </TableCell>
                                        <TableCell>Table {order.table_number}</TableCell>
                                        <TableCell>{order.server_name}</TableCell>
                                        <TableCell className="text-stone-500">
                                            {formatDate(order.created_at)}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatPriceSelling(order.total)}
                                        </TableCell>
                                        <TableCell className="text-right text-green-600">
                                            {formatPriceSelling(paidAmount)}
                                        </TableCell>
                                        <TableCell className="text-right text-amber-600 font-medium">
                                            {formatPriceSelling(remaining)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                onClick={() => openPaymentDialog(order)}
                                                className="rounded-full px-4 h-9"
                                                size="sm"
                                            >
                                                <Receipt className="w-4 h-4 mr-2" />
                                                Encaisser
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {filteredOrders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-stone-500">
                                        <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                        Aucune commande en attente de paiement
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card className="border-stone-100 shadow-sm mt-6">
                <CardHeader>
                    <CardTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                        Paiements récents
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Heure</TableHead>
                                <TableHead>Commande</TableHead>
                                <TableHead>Mode</TableHead>
                                <TableHead>Caissier</TableHead>
                                <TableHead className="text-right">Montant</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.slice(0, 10).map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell className="text-stone-500">
                                        {formatDate(payment.created_at)}
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium">
                                            #{orders.find(o => o.id === payment.order_id)?.order_number || '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="gap-1">
                                            {getMethodIcon(payment.method)}
                                            {getMethodLabel(payment.method)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{payment.cashier_name}</TableCell>
                                    <TableCell className="text-right font-medium text-green-600">
                                        {formatPriceSelling(payment.amount)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Payment Dialog */}
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                            Encaisser - Commande #{selectedOrder?.order_number}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* Currency Selection */}
                        {paymentCurrencies.length > 1 && (
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <ArrowRightLeft className="w-4 h-4" />
                                    Devise de paiement
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {paymentCurrencies.map(currency => (
                                        <Button
                                            key={currency.code}
                                            variant={paymentData.currency?.code === currency.code ? 'default' : 'outline'}
                                            onClick={() => handleCurrencyChange(currency.code)}
                                            className="h-12"
                                        >
                                            <span className="font-bold mr-2">{currency.symbol}</span>
                                            {currency.code}
                                            {currency.is_reference && (
                                                <Badge variant="secondary" className="ml-2 text-xs">Réf</Badge>
                                            )}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="text-center p-4 bg-stone-50 rounded-lg">
                            <p className="text-sm text-stone-500">Montant à payer</p>
                            <p className="text-3xl font-bold text-primary">
                                {formatPrice(paymentData.amountInCurrency, paymentData.currency)}
                            </p>
                            {paymentData.currency?.code !== sellingCurrency?.code && (
                                <p className="text-xs text-stone-400 mt-1">
                                    ≈ {formatPriceSelling(paymentData.amount)} (vente)
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Mode de paiement</Label>
                            <div className="grid grid-cols-3 gap-2">
                                <Button
                                    variant={paymentData.method === 'cash' ? 'default' : 'outline'}
                                    onClick={() => setPaymentData(prev => ({ ...prev, method: 'cash' }))}
                                    className="flex-col h-auto py-4"
                                >
                                    <Banknote className="w-6 h-6 mb-2" />
                                    Espèces
                                </Button>
                                <Button
                                    variant={paymentData.method === 'card' ? 'default' : 'outline'}
                                    onClick={() => setPaymentData(prev => ({ ...prev, method: 'card' }))}
                                    className="flex-col h-auto py-4"
                                >
                                    <CreditCard className="w-6 h-6 mb-2" />
                                    Carte
                                </Button>
                                <Button
                                    variant={paymentData.method === 'mobile_money' ? 'default' : 'outline'}
                                    onClick={() => setPaymentData(prev => ({ ...prev, method: 'mobile_money' }))}
                                    className="flex-col h-auto py-4"
                                >
                                    <Smartphone className="w-6 h-6 mb-2" />
                                    Mobile
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amount">
                                Montant reçu ({paymentData.currency?.symbol || 'FCFA'})
                            </Label>
                            <Input
                                id="amount"
                                type="number"
                                value={paymentData.amountInCurrency}
                                onChange={(e) => handleAmountChange(e.target.value)}
                            />
                            {paymentData.is_partial && (
                                <p className="text-xs text-amber-600">
                                    Paiement partiel - Un solde restera sur cette commande
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button 
                            onClick={handlePayment} 
                            className="rounded-full px-6"
                            disabled={paymentData.amountInCurrency <= 0}
                        >
                            Encaisser {formatPrice(paymentData.amountInCurrency, paymentData.currency)}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
