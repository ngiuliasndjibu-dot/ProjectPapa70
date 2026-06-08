import React, { useState, useEffect } from 'react';
import { ordersAPI, paymentsAPI, tablesAPI, orderSplitMergeAPI } from '../lib/api';
import { formatDate, getStatusLabel, getOrderStatusBadge } from '../lib/utils';
import { useCurrency } from '../contexts/CurrencyContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
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
    ArrowRightLeft,
    Split,
    Merge,
    Minus,
    Plus
} from 'lucide-react';

export default function PaymentsPage() {
    const [orders, setOrders] = useState([]);
    const [payments, setPayments] = useState([]);
    const [tables, setTables] = useState([]);
    const [dailyClose, setDailyClose] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    // Split / Merge state
    const [splitDialogOpen, setSplitDialogOpen] = useState(false);
    const [splitOrder, setSplitOrder] = useState(null);
    const [splitMode, setSplitMode] = useState('by_items'); // 'by_items' | 'equal'
    const [splitSelectedItems, setSplitSelectedItems] = useState([]); // item ids for part A
    const [splitEqualParts, setSplitEqualParts] = useState(2);
    const [splitSubmitting, setSplitSubmitting] = useState(false);
    const [mergeSelection, setMergeSelection] = useState([]); // order ids
    const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
    const [mergeTargetTable, setMergeTargetTable] = useState('');
    const [mergeSubmitting, setMergeSubmitting] = useState(false);
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
            const [ordersRes, paymentsRes, closeRes, tablesRes] = await Promise.all([
                ordersAPI.getAll(),
                paymentsAPI.getAll(),
                paymentsAPI.getDailyClose(),
                tablesAPI.getAll()
            ]);
            setOrders(ordersRes.data.filter(o => o.status !== 'cancelled'));
            setPayments(paymentsRes.data);
            setDailyClose(closeRes.data);
            setTables(tablesRes.data);
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

    // ---- Split bill ----
    const openSplitDialog = (order) => {
        setSplitOrder(order);
        setSplitMode('by_items');
        setSplitSelectedItems([]);
        setSplitEqualParts(2);
        setSplitDialogOpen(true);
    };

    const toggleSplitItem = (itemId) => {
        setSplitSelectedItems(prev =>
            prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
        );
    };

    const handleSplitSubmit = async () => {
        if (!splitOrder) return;
        setSplitSubmitting(true);
        try {
            if (splitMode === 'by_items') {
                const allIds = (splitOrder.items || []).map(i => i.id);
                const partA = splitSelectedItems;
                const partB = allIds.filter(id => !partA.includes(id));
                if (partA.length === 0 || partB.length === 0) {
                    toast.error('Sélectionnez au moins un article pour chaque addition');
                    setSplitSubmitting(false);
                    return;
                }
                await orderSplitMergeAPI.split(splitOrder.id, 'by_items', {
                    parts: [
                        { item_ids: partA, table_id: splitOrder.table_id },
                        { item_ids: partB, table_id: splitOrder.table_id },
                    ]
                });
            } else {
                await orderSplitMergeAPI.split(splitOrder.id, 'equal', {
                    num_parts: splitEqualParts,
                    table_ids: Array(splitEqualParts).fill(splitOrder.table_id)
                });
            }
            toast.success('Addition divisée avec succès');
            setSplitDialogOpen(false);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Erreur lors de la division');
        } finally {
            setSplitSubmitting(false);
        }
    };

    // ---- Merge bills ----
    const toggleMergeSelection = (orderId) => {
        setMergeSelection(prev =>
            prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
        );
    };

    const openMergeDialog = () => {
        if (mergeSelection.length < 2) {
            toast.error('Sélectionnez au moins 2 commandes à fusionner');
            return;
        }
        const firstOrder = orders.find(o => o.id === mergeSelection[0]);
        setMergeTargetTable(firstOrder?.table_id || '');
        setMergeDialogOpen(true);
    };

    const handleMergeSubmit = async () => {
        if (!mergeTargetTable) {
            toast.error('Sélectionnez une table de destination');
            return;
        }
        setMergeSubmitting(true);
        try {
            await orderSplitMergeAPI.merge(mergeSelection, mergeTargetTable);
            toast.success('Commandes fusionnées avec succès');
            setMergeDialogOpen(false);
            setMergeSelection([]);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Erreur lors de la fusion');
        } finally {
            setMergeSubmitting(false);
        }
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
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                        Commandes en attente de paiement
                    </CardTitle>
                    {mergeSelection.length >= 2 && (
                        <Button
                            onClick={openMergeDialog}
                            className="rounded-full px-4 h-9"
                            size="sm"
                            data-testid="merge-orders-btn"
                        >
                            <Merge className="w-4 h-4 mr-2" />
                            Fusionner ({mergeSelection.length})
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10"></TableHead>
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
                                            <Checkbox
                                                checked={mergeSelection.includes(order.id)}
                                                onCheckedChange={() => toggleMergeSelection(order.id)}
                                                data-testid={`merge-select-${order.order_number}`}
                                            />
                                        </TableCell>
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
                                            <div className="flex items-center justify-end gap-2">
                                                {(order.items?.length || 0) > 1 && (
                                                    <Button
                                                        onClick={() => openSplitDialog(order)}
                                                        variant="outline"
                                                        className="rounded-full px-3 h-9"
                                                        size="sm"
                                                        data-testid={`split-order-${order.order_number}`}
                                                    >
                                                        <Split className="w-4 h-4 mr-1" />
                                                        Diviser
                                                    </Button>
                                                )}
                                                <Button
                                                    onClick={() => openPaymentDialog(order)}
                                                    className="rounded-full px-4 h-9"
                                                    size="sm"
                                                    data-testid={`collect-payment-${order.order_number}`}
                                                >
                                                    <Receipt className="w-4 h-4 mr-2" />
                                                    Encaisser
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {filteredOrders.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-stone-500">
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

            {/* Split Bill Dialog */}
            <Dialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                            Diviser l&apos;addition - Commande #{splitOrder?.order_number}
                        </DialogTitle>
                        <DialogDescription>
                            Séparez cette commande en plusieurs additions distinctes.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* Mode selector */}
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant={splitMode === 'by_items' ? 'default' : 'outline'}
                                onClick={() => setSplitMode('by_items')}
                                data-testid="split-mode-by-items"
                            >
                                Par articles
                            </Button>
                            <Button
                                variant={splitMode === 'equal' ? 'default' : 'outline'}
                                onClick={() => setSplitMode('equal')}
                                data-testid="split-mode-equal"
                            >
                                Montant égal
                            </Button>
                        </div>

                        {splitMode === 'by_items' ? (
                            <div className="space-y-2">
                                <Label className="text-xs text-stone-500">
                                    Sélectionnez les articles de la 1ère addition (le reste forme la 2ème)
                                </Label>
                                <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
                                    {(splitOrder?.items || []).map((item) => (
                                        <label
                                            key={item.id}
                                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-stone-50"
                                        >
                                            <Checkbox
                                                checked={splitSelectedItems.includes(item.id)}
                                                onCheckedChange={() => toggleSplitItem(item.id)}
                                                data-testid={`split-item-${item.id}`}
                                            />
                                            <div className="flex-1">
                                                <span className="text-sm font-medium">
                                                    {item.quantity}× {item.menu_item_name}
                                                </span>
                                            </div>
                                            <span className="text-sm text-primary font-semibold">
                                                {formatPriceSelling(item.quantity * item.unit_price)}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                <div className="flex justify-between text-sm pt-2">
                                    <span className="text-stone-500">
                                        Addition 1: {splitSelectedItems.length} article(s)
                                    </span>
                                    <span className="text-stone-500">
                                        Addition 2: {(splitOrder?.items?.length || 0) - splitSelectedItems.length} article(s)
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <Label className="text-xs text-stone-500">Nombre d&apos;additions égales</Label>
                                <div className="flex items-center gap-4">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setSplitEqualParts(p => Math.max(2, p - 1))}
                                    >
                                        <Minus className="w-4 h-4" />
                                    </Button>
                                    <span className="text-2xl font-bold w-12 text-center" data-testid="split-equal-count">
                                        {splitEqualParts}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setSplitEqualParts(p => Math.min(8, p + 1))}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                {splitOrder && (
                                    <div className="text-center p-3 bg-stone-50 rounded-lg">
                                        <p className="text-sm text-stone-500">Montant par addition</p>
                                        <p className="text-2xl font-bold text-primary">
                                            {formatPriceSelling(splitOrder.total / splitEqualParts)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSplitDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={handleSplitSubmit}
                            className="rounded-full px-6"
                            disabled={splitSubmitting}
                            data-testid="confirm-split-btn"
                        >
                            {splitSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Split className="w-4 h-4 mr-2" />}
                            Diviser
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Merge Bills Dialog */}
            <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                            Fusionner les commandes
                        </DialogTitle>
                        <DialogDescription>
                            {mergeSelection.length} commandes seront regroupées en une seule addition.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1 text-sm">
                            {mergeSelection.map(id => {
                                const o = orders.find(ord => ord.id === id);
                                if (!o) return null;
                                return (
                                    <div key={id} className="flex justify-between p-2 bg-stone-50 rounded">
                                        <span>#{o.order_number} — Table {o.table_number}</span>
                                        <span className="font-medium">{formatPriceSelling(o.total)}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="space-y-2">
                            <Label>Table de destination</Label>
                            <Select value={mergeTargetTable} onValueChange={setMergeTargetTable}>
                                <SelectTrigger data-testid="merge-target-table">
                                    <SelectValue placeholder="Choisir une table" />
                                </SelectTrigger>
                                <SelectContent>
                                    {mergeSelection.map(id => {
                                        const o = orders.find(ord => ord.id === id);
                                        if (!o) return null;
                                        return (
                                            <SelectItem key={o.table_id} value={o.table_id}>
                                                Table {o.table_number}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button
                            onClick={handleMergeSubmit}
                            className="rounded-full px-6"
                            disabled={mergeSubmitting}
                            data-testid="confirm-merge-btn"
                        >
                            {mergeSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Merge className="w-4 h-4 mr-2" />}
                            Fusionner
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
