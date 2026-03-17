import React, { useState, useEffect } from 'react';
import { bottlesAPI } from '../lib/api';
import { useCurrency } from '../contexts/CurrencyContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { 
    Plus, 
    Edit2,
    Beaker,
    Loader2,
    Search,
    AlertTriangle,
    Droplet,
    Wine
} from 'lucide-react';

export default function BottlesPage() {
    const [bottles, setBottles] = useState([]);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isPourDialogOpen, setIsPourDialogOpen] = useState(false);
    const [editingBottle, setEditingBottle] = useState(null);
    const [selectedBottle, setSelectedBottle] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [pourVolume, setPourVolume] = useState(30);
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        total_volume_ml: 700,
        purchase_price: 0,
        quantity_in_stock: 1,
        alert_threshold: 2,
        shot_size_ml: 30,
    });
    
    const { formatPriceSelling, sellingCurrency, referenceCurrency, convertSellingToReference, formatPrice, loading: currencyLoading } = useCurrency();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [bottlesRes, reportRes] = await Promise.all([
                bottlesAPI.getAll(),
                bottlesAPI.getReport()
            ]);
            setBottles(bottlesRes.data);
            setReport(reportRes.data);
        } catch (err) {
            toast.error('Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    };

    const openCreateDialog = () => {
        setEditingBottle(null);
        setFormData({
            name: '',
            brand: '',
            total_volume_ml: 700,
            purchase_price: 0,
            quantity_in_stock: 1,
            alert_threshold: 2,
            shot_size_ml: 30,
        });
        setIsDialogOpen(true);
    };

    const openEditDialog = (bottle) => {
        setEditingBottle(bottle);
        setFormData({
            name: bottle.name,
            brand: bottle.brand,
            total_volume_ml: bottle.total_volume_ml,
            purchase_price: bottle.purchase_price,
            quantity_in_stock: bottle.quantity_in_stock,
            alert_threshold: bottle.alert_threshold,
            shot_size_ml: bottle.shot_size_ml,
        });
        setIsDialogOpen(true);
    };

    const openPourDialog = (bottle) => {
        setSelectedBottle(bottle);
        setPourVolume(bottle.shot_size_ml);
        setIsPourDialogOpen(true);
    };

    const handleSubmit = async () => {
        try {
            if (editingBottle) {
                await bottlesAPI.update(editingBottle.id, formData);
                toast.success('Bouteille mise à jour');
            } else {
                await bottlesAPI.create(formData);
                toast.success('Bouteille ajoutée');
            }
            setIsDialogOpen(false);
            loadData();
        } catch (err) {
            toast.error('Erreur lors de l\'enregistrement');
        }
    };

    const handlePour = async () => {
        try {
            await bottlesAPI.pour(selectedBottle.id, pourVolume);
            toast.success(`${pourVolume}ml versé`);
            setIsPourDialogOpen(false);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Erreur lors du versement');
        }
    };

    const filteredBottles = bottles.filter(bottle =>
        bottle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bottle.brand.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const lowStockBottles = bottles.filter(b => b.quantity_in_stock <= b.alert_threshold);

    if (loading || currencyLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8" data-testid="bottles-page">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                        Gestion des bouteilles
                    </h1>
                    <p className="text-stone-500 mt-1">{bottles.length} références en stock</p>
                </div>
                <Button 
                    onClick={openCreateDialog}
                    className="rounded-full px-6 h-12 btn-press"
                    data-testid="add-bottle-btn"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter une bouteille
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="border-stone-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                                <Wine className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-stone-500">Total bouteilles</p>
                                <p className="text-2xl font-bold">{bottles.reduce((sum, b) => sum + b.quantity_in_stock, 0)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-stone-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                <Droplet className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-stone-500">Volume versé (jour)</p>
                                <p className="text-2xl font-bold">{report?.total_volume_poured_ml || 0} ml</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className={lowStockBottles.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-stone-100'}>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${lowStockBottles.length > 0 ? 'bg-amber-100' : 'bg-stone-100'}`}>
                                <AlertTriangle className={`w-6 h-6 ${lowStockBottles.length > 0 ? 'text-amber-600' : 'text-stone-400'}`} />
                            </div>
                            <div>
                                <p className="text-sm text-stone-500">Stock bas</p>
                                <p className="text-2xl font-bold">{lowStockBottles.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-md mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input
                    placeholder="Rechercher une bouteille..."
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
                                <TableHead>Bouteille</TableHead>
                                <TableHead>Volume</TableHead>
                                <TableHead>Shots théoriques</TableHead>
                                <TableHead>Niveau actuel</TableHead>
                                <TableHead className="text-center">Stock</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBottles.map((bottle) => {
                                const currentPercent = ((bottle.current_volume_ml || bottle.total_volume_ml) / bottle.total_volume_ml) * 100;
                                return (
                                    <TableRow key={bottle.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                                                    <Beaker className="w-5 h-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{bottle.name}</p>
                                                    <p className="text-xs text-stone-500">{bottle.brand}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{bottle.total_volume_ml} ml</TableCell>
                                        <TableCell>
                                            <span className="font-medium">{bottle.theoretical_shots}</span>
                                            <span className="text-stone-500 text-xs ml-1">({bottle.shot_size_ml}ml)</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="w-32">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span>{bottle.current_volume_ml || bottle.total_volume_ml} ml</span>
                                                    <span>{Math.round(currentPercent)}%</span>
                                                </div>
                                                <Progress value={currentPercent} className="h-2" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={bottle.quantity_in_stock <= bottle.alert_threshold ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                                                {bottle.quantity_in_stock}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openPourDialog(bottle)}
                                                    className="gap-1"
                                                >
                                                    <Droplet className="w-3 h-3" />
                                                    Verser
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditDialog(bottle)}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                            {editingBottle ? 'Modifier la bouteille' : 'Nouvelle bouteille'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nom</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ex: Vodka"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="brand">Marque</Label>
                                <Input
                                    id="brand"
                                    value={formData.brand}
                                    onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                                    placeholder="Ex: Absolut"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="total_volume_ml">Volume (ml)</Label>
                                <Input
                                    id="total_volume_ml"
                                    type="number"
                                    value={formData.total_volume_ml}
                                    onChange={(e) => setFormData(prev => ({ ...prev, total_volume_ml: parseInt(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="shot_size_ml">Taille shot (ml)</Label>
                                <Input
                                    id="shot_size_ml"
                                    type="number"
                                    value={formData.shot_size_ml}
                                    onChange={(e) => setFormData(prev => ({ ...prev, shot_size_ml: parseInt(e.target.value) }))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="purchase_price">Prix d'achat (FCFA)</Label>
                                <Input
                                    id="purchase_price"
                                    type="number"
                                    value={formData.purchase_price}
                                    onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: parseFloat(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="quantity_in_stock">Quantité en stock</Label>
                                <Input
                                    id="quantity_in_stock"
                                    type="number"
                                    value={formData.quantity_in_stock}
                                    onChange={(e) => setFormData(prev => ({ ...prev, quantity_in_stock: parseInt(e.target.value) }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="alert_threshold">Seuil d'alerte</Label>
                            <Input
                                id="alert_threshold"
                                type="number"
                                value={formData.alert_threshold}
                                onChange={(e) => setFormData(prev => ({ ...prev, alert_threshold: parseInt(e.target.value) }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleSubmit} className="rounded-full px-6">
                            {editingBottle ? 'Enregistrer' : 'Créer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Pour Dialog */}
            <Dialog open={isPourDialogOpen} onOpenChange={setIsPourDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                            Verser - {selectedBottle?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="text-center p-4 bg-stone-50 rounded-lg">
                            <p className="text-sm text-stone-500">Volume restant</p>
                            <p className="text-2xl font-bold">
                                {selectedBottle?.current_volume_ml || selectedBottle?.total_volume_ml} ml
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pour_volume">Volume à verser (ml)</Label>
                            <Input
                                id="pour_volume"
                                type="number"
                                value={pourVolume}
                                onChange={(e) => setPourVolume(parseInt(e.target.value))}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                onClick={() => setPourVolume(selectedBottle?.shot_size_ml || 30)}
                                className="flex-1"
                            >
                                Shot ({selectedBottle?.shot_size_ml || 30}ml)
                            </Button>
                            <Button 
                                variant="outline" 
                                onClick={() => setPourVolume((selectedBottle?.shot_size_ml || 30) * 2)}
                                className="flex-1"
                            >
                                Double ({(selectedBottle?.shot_size_ml || 30) * 2}ml)
                            </Button>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPourDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handlePour} className="rounded-full px-6">
                            Verser {pourVolume}ml
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
