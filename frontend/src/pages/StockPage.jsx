import React, { useState, useEffect } from 'react';
import { stockAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { 
    Plus, 
    Edit2, 
    Trash2,
    Package,
    Loader2,
    Search,
    TrendingDown,
    TrendingUp,
    AlertTriangle
} from 'lucide-react';

export default function StockPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        unit: 'kg',
        quantity: 0,
        alert_threshold: 10,
        category: 'Ingrédients',
    });
    const [movementData, setMovementData] = useState({
        quantity_change: 0,
        reason: '',
    });

    const categories = ['Ingrédients', 'Viandes', 'Légumes', 'Produits laitiers', 'Boissons', 'Autres'];
    const units = ['kg', 'g', 'l', 'ml', 'unité', 'pièce'];

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        try {
            const response = await stockAPI.getAll();
            setItems(response.data);
        } catch (err) {
            toast.error('Erreur lors du chargement du stock');
        } finally {
            setLoading(false);
        }
    };

    const openCreateDialog = () => {
        setEditingItem(null);
        setFormData({
            name: '',
            unit: 'kg',
            quantity: 0,
            alert_threshold: 10,
            category: 'Ingrédients',
        });
        setIsDialogOpen(true);
    };

    const openEditDialog = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            alert_threshold: item.alert_threshold,
            category: item.category,
        });
        setIsDialogOpen(true);
    };

    const openMovementDialog = (item) => {
        setSelectedItem(item);
        setMovementData({ quantity_change: 0, reason: '' });
        setIsMovementDialogOpen(true);
    };

    const handleSubmit = async () => {
        try {
            if (editingItem) {
                await stockAPI.update(editingItem.id, formData);
                toast.success('Article mis à jour');
            } else {
                await stockAPI.create(formData);
                toast.success('Article créé');
            }
            setIsDialogOpen(false);
            loadItems();
        } catch (err) {
            toast.error('Erreur lors de l\'enregistrement');
        }
    };

    const handleMovement = async () => {
        try {
            await stockAPI.recordMovement(selectedItem.id, movementData.quantity_change, movementData.reason);
            toast.success('Mouvement enregistré');
            setIsMovementDialogOpen(false);
            loadItems();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Erreur lors de l\'enregistrement');
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const lowStockItems = items.filter(item => item.quantity <= item.alert_threshold);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8" data-testid="stock-page">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                        Gestion du stock
                    </h1>
                    <p className="text-stone-500 mt-1">{items.length} articles en stock</p>
                </div>
                <Button 
                    onClick={openCreateDialog}
                    className="rounded-full px-6 h-12 btn-press"
                    data-testid="add-stock-btn"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un article
                </Button>
            </div>

            {/* Alerts */}
            {lowStockItems.length > 0 && (
                <Card className="border-amber-200 bg-amber-50 mb-6">
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                            <span className="font-medium text-amber-800">
                                {lowStockItems.length} article(s) en stock bas
                            </span>
                            <div className="flex gap-2 ml-auto">
                                {lowStockItems.slice(0, 3).map(item => (
                                    <Badge key={item.id} variant="outline" className="border-amber-300 text-amber-700">
                                        {item.name}
                                    </Badge>
                                ))}
                                {lowStockItems.length > 3 && (
                                    <Badge variant="outline" className="border-amber-300 text-amber-700">
                                        +{lowStockItems.length - 3}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Search */}
            <div className="relative max-w-md mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input
                    placeholder="Rechercher un article..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Table */}
            <Card className="border-stone-100 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Article</TableHead>
                                <TableHead>Catégorie</TableHead>
                                <TableHead className="text-right">Quantité</TableHead>
                                <TableHead className="text-right">Seuil d'alerte</TableHead>
                                <TableHead className="text-center">Statut</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center">
                                                <Package className="w-5 h-5 text-stone-500" />
                                            </div>
                                            <span className="font-medium">{item.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{item.category}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {item.quantity} {item.unit}
                                    </TableCell>
                                    <TableCell className="text-right text-stone-500">
                                        {item.alert_threshold} {item.unit}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {item.quantity <= item.alert_threshold ? (
                                            <Badge className="bg-red-100 text-red-800">Stock bas</Badge>
                                        ) : (
                                            <Badge className="bg-green-100 text-green-800">OK</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openMovementDialog(item)}
                                                className="gap-1"
                                            >
                                                <TrendingUp className="w-3 h-3" />
                                                <TrendingDown className="w-3 h-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditDialog(item)}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                            {editingItem ? 'Modifier l\'article' : 'Nouvel article'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nom</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="quantity">Quantité</Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    step="0.1"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="unit">Unité</Label>
                                <Select 
                                    value={formData.unit} 
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {units.map(unit => (
                                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="alert_threshold">Seuil d'alerte</Label>
                                <Input
                                    id="alert_threshold"
                                    type="number"
                                    step="0.1"
                                    value={formData.alert_threshold}
                                    onChange={(e) => setFormData(prev => ({ ...prev, alert_threshold: parseFloat(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Catégorie</Label>
                                <Select 
                                    value={formData.category} 
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleSubmit} className="rounded-full px-6">
                            {editingItem ? 'Enregistrer' : 'Créer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Movement Dialog */}
            <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                            Mouvement de stock - {selectedItem?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="text-center p-4 bg-stone-50 rounded-lg">
                            <p className="text-sm text-stone-500">Stock actuel</p>
                            <p className="text-2xl font-bold">{selectedItem?.quantity} {selectedItem?.unit}</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quantity_change">Quantité (+/-)</Label>
                            <Input
                                id="quantity_change"
                                type="number"
                                step="0.1"
                                value={movementData.quantity_change}
                                onChange={(e) => setMovementData(prev => ({ ...prev, quantity_change: parseFloat(e.target.value) }))}
                                placeholder="Ex: 10 pour entrée, -5 pour sortie"
                            />
                            <p className="text-xs text-stone-500">
                                Utilisez un nombre positif pour une entrée, négatif pour une sortie
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reason">Motif</Label>
                            <Input
                                id="reason"
                                value={movementData.reason}
                                onChange={(e) => setMovementData(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="Ex: Livraison, Utilisation cuisine..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMovementDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button 
                            onClick={handleMovement} 
                            className="rounded-full px-6"
                            disabled={!movementData.reason || movementData.quantity_change === 0}
                        >
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
