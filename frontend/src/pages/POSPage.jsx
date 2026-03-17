import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { menuAPI, ordersAPI, tablesAPI } from '../lib/api';
import { cn, getDepartmentLabel } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';
import { 
    Plus, 
    Minus, 
    Trash2, 
    Send, 
    Search,
    ChefHat,
    Wine,
    Loader2,
    X,
    StickyNote,
    Table2
} from 'lucide-react';

export default function POSPage() {
    const [searchParams] = useSearchParams();
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('Tous');
    const [cart, setCart] = useState([]);
    const [notes, setNotes] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [tableSelectOpen, setTableSelectOpen] = useState(false);
    const [noteDialogOpen, setNoteDialogOpen] = useState(false);
    const [noteItemId, setNoteItemId] = useState(null);
    const [itemNote, setItemNote] = useState('');
    const { user } = useAuth();
    const { sellingCurrency, referenceCurrency, formatPriceSelling, getDisplayPrice, loading: currencyLoading } = useCurrency();

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const tableId = searchParams.get('table');
        const tableNumber = searchParams.get('tableNumber');
        if (tableId && tableNumber) {
            setSelectedTable({ id: tableId, number: parseInt(tableNumber) });
        }
    }, [searchParams]);

    const loadData = async () => {
        try {
            const [menuRes, tablesRes] = await Promise.all([
                menuAPI.getAll(),
                tablesAPI.getAll()
            ]);
            const activeItems = menuRes.data.filter(item => item.is_active);
            setMenuItems(activeItems);
            setTables(tablesRes.data);
            
            const cats = ['Tous', ...new Set(activeItems.map(item => item.category))];
            setCategories(cats);
        } catch (err) {
            toast.error('Erreur lors du chargement du menu');
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = menuItems.filter(item => {
        const matchesCategory = selectedCategory === 'Tous' || item.category === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const addToCart = (item) => {
        setCart(prev => {
            const existing = prev.find(i => i.menu_item_id === item.id && !i.notes);
            if (existing) {
                return prev.map(i => 
                    i.menu_item_id === item.id && !i.notes
                        ? { ...i, quantity: i.quantity + 1 }
                        : i
                );
            }
            return [...prev, {
                id: Date.now().toString(),
                menu_item_id: item.id,
                menu_item_name: item.name,
                quantity: 1,
                unit_price: item.price,
                department: item.department,
                notes: ''
            }];
        });
    };

    const updateQuantity = (cartItemId, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === cartItemId) {
                const newQty = item.quantity + delta;
                if (newQty <= 0) return null;
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(Boolean));
    };

    const removeFromCart = (cartItemId) => {
        setCart(prev => prev.filter(item => item.id !== cartItemId));
    };

    const openNoteDialog = (cartItemId, currentNote) => {
        setNoteItemId(cartItemId);
        setItemNote(currentNote || '');
        setNoteDialogOpen(true);
    };

    const saveItemNote = () => {
        setCart(prev => prev.map(item => 
            item.id === noteItemId ? { ...item, notes: itemNote } : item
        ));
        setNoteDialogOpen(false);
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const cartTotalSelling = getDisplayPrice(cartTotal);
    const kitchenItems = cart.filter(item => item.department === 'kitchen');
    const barItems = cart.filter(item => item.department === 'bar');

    const sendOrder = async () => {
        if (!selectedTable) {
            setTableSelectOpen(true);
            return;
        }
        if (cart.length === 0) {
            toast.error('Le panier est vide');
            return;
        }

        setSending(true);
        try {
            const orderData = {
                table_id: selectedTable.id,
                table_number: selectedTable.number,
                items: cart.map(({ menu_item_id, menu_item_name, quantity, unit_price, department, notes }) => ({
                    menu_item_id,
                    menu_item_name,
                    quantity,
                    unit_price,
                    department,
                    notes: notes || ''
                })),
                notes
            };

            await ordersAPI.create(orderData);
            toast.success('Commande envoyée!');
            setCart([]);
            setNotes('');
        } catch (err) {
            toast.error('Erreur lors de l\'envoi de la commande');
        } finally {
            setSending(false);
        }
    };

    const selectTable = (table) => {
        setSelectedTable(table);
        setTableSelectOpen(false);
    };

    if (loading || currencyLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col" data-testid="pos-page">
            {/* Header */}
            <div className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                        Point de vente
                    </h1>
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setTableSelectOpen(true)}
                        className="flex items-center gap-2"
                        data-testid="select-table-btn"
                    >
                        <Table2 className="w-4 h-4" />
                        {selectedTable ? `Table ${selectedTable.number}` : 'Sélectionner une table'}
                    </Button>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <Input
                        placeholder="Rechercher..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-10"
                        data-testid="search-input"
                    />
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Menu Section */}
                <div className="flex-1 flex flex-col overflow-hidden bg-stone-50">
                    {/* Categories */}
                    <div className="bg-white border-b border-stone-200 px-4 py-2">
                        <ScrollArea className="w-full">
                            <div className="flex gap-2 pb-2">
                                {categories.map((category) => (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={cn(
                                            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors category-tab',
                                            selectedCategory === category && 'active'
                                        )}
                                        data-testid={`category-${category}`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Menu Items Grid */}
                    <ScrollArea className="flex-1 p-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {filteredItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => addToCart(item)}
                                    className="bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer text-left card-hover btn-press"
                                    data-testid={`menu-item-${item.id}`}
                                >
                                    {item.image_url && (
                                        <div className="aspect-square overflow-hidden">
                                            <img 
                                                src={item.image_url} 
                                                alt={item.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        </div>
                                    )}
                                    <div className="p-3">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h3 className="font-medium text-stone-800 text-sm leading-tight">
                                                {item.name}
                                            </h3>
                                            {item.department === 'kitchen' ? (
                                                <ChefHat className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                            ) : (
                                                <Wine className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-primary font-bold">
                                            {formatPriceSelling(item.price)}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                {/* Cart Section */}
                <div className="w-full lg:w-96 bg-white border-l border-stone-200 flex flex-col shadow-xl">
                    {/* Cart Header */}
                    <div className="p-4 border-b border-stone-200">
                        <h2 className="text-lg font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                            Commande en cours
                        </h2>
                        {selectedTable && (
                            <p className="text-sm text-stone-500">Table {selectedTable.number}</p>
                        )}
                    </div>

                    {/* Cart Items */}
                    <ScrollArea className="flex-1">
                        <div className="p-4 space-y-3">
                            {cart.length === 0 ? (
                                <p className="text-stone-500 text-center py-8">
                                    Le panier est vide
                                </p>
                            ) : (
                                <>
                                    {kitchenItems.length > 0 && (
                                        <div className="mb-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <ChefHat className="w-4 h-4 text-amber-500" />
                                                <span className="text-xs font-semibold text-stone-500 uppercase">Cuisine</span>
                                            </div>
                                            {kitchenItems.map((item) => (
                                                <CartItem 
                                                    key={item.id} 
                                                    item={item} 
                                                    onUpdateQuantity={updateQuantity}
                                                    onRemove={removeFromCart}
                                                    onAddNote={openNoteDialog}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    {barItems.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Wine className="w-4 h-4 text-green-500" />
                                                <span className="text-xs font-semibold text-stone-500 uppercase">Bar</span>
                                            </div>
                                            {barItems.map((item) => (
                                                <CartItem 
                                                    key={item.id} 
                                                    item={item} 
                                                    onUpdateQuantity={updateQuantity}
                                                    onRemove={removeFromCart}
                                                    onAddNote={openNoteDialog}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Order Notes */}
                    {cart.length > 0 && (
                        <div className="p-4 border-t border-stone-200">
                            <Textarea
                                placeholder="Notes pour la commande..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="resize-none h-16"
                            />
                        </div>
                    )}

                    {/* Cart Footer */}
                    <div className="p-4 border-t border-stone-200 bg-stone-50">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-lg font-semibold">Total</span>
                            <span className="text-2xl font-bold text-primary">
                                {formatPriceSelling(cartTotal)}
                            </span>
                        </div>
                        <Button 
                            onClick={sendOrder}
                            disabled={cart.length === 0 || sending}
                            className="w-full h-14 text-lg rounded-full btn-press"
                            data-testid="send-order-btn"
                        >
                            {sending ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Envoi...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5 mr-2" />
                                    Envoyer la commande
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Table Selection Dialog */}
            <Dialog open={tableSelectOpen} onOpenChange={setTableSelectOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                            Sélectionner une table
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-4 gap-3 py-4">
                        {tables.filter(t => t.status !== 'cleaning').map((table) => (
                            <button
                                key={table.id}
                                onClick={() => selectTable(table)}
                                className={cn(
                                    'p-4 rounded-lg border-2 text-center font-bold transition-all btn-press',
                                    table.status === 'free' && 'border-green-300 bg-green-50 hover:border-green-500',
                                    table.status === 'occupied' && 'border-primary/30 bg-primary/5 hover:border-primary',
                                    table.status === 'reserved' && 'border-amber-300 bg-amber-50 hover:border-amber-500',
                                    selectedTable?.id === table.id && 'ring-2 ring-primary'
                                )}
                            >
                                {table.number}
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Item Note Dialog */}
            <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Note pour l'article</DialogTitle>
                    </DialogHeader>
                    <Textarea
                        placeholder="Ex: Sans oignon, bien cuit..."
                        value={itemNote}
                        onChange={(e) => setItemNote(e.target.value)}
                        className="min-h-[100px]"
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={saveItemNote}>
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CartItem({ item, onUpdateQuantity, onRemove, onAddNote, formatPrice }) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-stone-100 last:border-0 animate-fade-in">
            <div className="flex-1">
                <h4 className="font-medium text-stone-800 text-sm">{item.menu_item_name}</h4>
                <p className="text-primary font-semibold text-sm">{formatPrice(item.unit_price)}</p>
                {item.notes && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <StickyNote className="w-3 h-3" />
                        {item.notes}
                    </p>
                )}
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onAddNote(item.id, item.notes)}
                    className="p-1 hover:bg-stone-100 rounded"
                >
                    <StickyNote className="w-4 h-4 text-stone-400" />
                </button>
                <div className="flex items-center bg-stone-100 rounded-full">
                    <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="p-2 hover:bg-stone-200 rounded-full transition-colors"
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">{item.quantity}</span>
                    <button
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="p-2 hover:bg-stone-200 rounded-full transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                <button
                    onClick={() => onRemove(item.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
