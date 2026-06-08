import React, { useState, useEffect } from 'react';
import { menuAPI } from '../lib/api';
import { getDepartmentLabel } from '../lib/utils';
import { useCurrency } from '../contexts/CurrencyContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { 
    Plus, 
    Edit2, 
    Trash2,
    ChefHat,
    Wine,
    Loader2,
    Search,
    UtensilsCrossed
} from 'lucide-react';

export default function MenuPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: 0,
        category: 'Plats',
        department: 'kitchen',
        image_url: '',
        is_active: true,
    });
    
    const { formatPriceSelling, sellingCurrency, referenceCurrency, convertSellingToReference, formatPrice, loading: currencyLoading } = useCurrency();

    const categories = ['Entrées', 'Plats', 'Desserts', 'Boissons', 'Cocktails', 'Vins', 'Bières', 'Shots'];

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        try {
            const response = await menuAPI.getAll();
            setItems(response.data);
        } catch (err) {
            toast.error('Erreur lors du chargement du menu');
        } finally {
            setLoading(false);
        }
    };

    const openCreateDialog = () => {
        setEditingItem(null);
        setFormData({
            name: '',
            description: '',
            price: 0,
            category: 'Plats',
            department: 'kitchen',
            image_url: '',
            is_active: true,
        });
        setIsDialogOpen(true);
    };

    const openEditDialog = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            description: item.description,
            price: item.price,
            category: item.category,
            department: item.department,
            image_url: item.image_url || '',
            is_active: item.is_active,
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        try {
            if (editingItem) {
                await menuAPI.update(editingItem.id, formData);
                toast.success('Article mis à jour');
            } else {
                await menuAPI.create(formData);
                toast.success('Article créé');
            }
            setIsDialogOpen(false);
            loadItems();
        } catch (err) {
            toast.error('Erreur lors de l\'enregistrement');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet article?')) return;
        try {
            await menuAPI.delete(id);
            toast.success('Article supprimé');
            loadItems();
        } catch (err) {
            toast.error('Erreur lors de la suppression');
        }
    };

    const toggleActive = async (item) => {
        try {
            await menuAPI.update(item.id, { is_active: !item.is_active });
            toast.success(item.is_active ? 'Article désactivé' : 'Article activé');
            loadItems();
        } catch (err) {
            toast.error('Erreur lors de la mise à jour');
        }
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    if (loading || currencyLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8" data-testid="menu-page">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                        Gestion du menu
                    </h1>
                    <p className="text-stone-500 mt-1">{items.length} articles au menu</p>
                </div>
                <Button 
                    onClick={openCreateDialog}
                    className="rounded-full px-6 h-12 btn-press"
                    data-testid="add-menu-item-btn"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un article
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <Input
                        placeholder="Rechercher un article..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Toutes les catégories</SelectItem>
                        {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <Card className="border-stone-100 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16">Image</TableHead>
                                <TableHead>Nom</TableHead>
                                <TableHead>Catégorie</TableHead>
                                <TableHead>Département</TableHead>
                                <TableHead className="text-right">Prix</TableHead>
                                <TableHead className="text-center">Actif</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        {item.image_url ? (
                                            <img 
                                                src={item.image_url} 
                                                alt={item.name}
                                                className="w-12 h-12 rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center">
                                                <UtensilsCrossed className="w-5 h-5 text-stone-400" />
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-xs text-stone-500 truncate max-w-[200px]">
                                                {item.description}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{item.category}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={item.department === 'kitchen' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}>
                                            {item.department === 'kitchen' ? (
                                                <ChefHat className="w-3 h-3 mr-1" />
                                            ) : (
                                                <Wine className="w-3 h-3 mr-1" />
                                            )}
                                            {getDepartmentLabel(item.department)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        <div>
                                            <span>{formatPriceSelling(item.price)}</span>
                                            {referenceCurrency && sellingCurrency && referenceCurrency.code !== sellingCurrency.code && (
                                                <span className="text-xs text-stone-400 ml-1">
                                                    ({formatPrice(convertSellingToReference(item.price), referenceCurrency)})
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Switch 
                                            checked={item.is_active}
                                            onCheckedChange={() => toggleActive(item)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditDialog(item)}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDelete(item.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
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
                <DialogContent className="max-w-md">
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
                                placeholder="Nom de l'article"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Description de l'article"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="price">Prix (FC)</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) }))}
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
                        <div className="space-y-2">
                            <Label htmlFor="department">Département</Label>
                            <Select 
                                value={formData.department} 
                                onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="kitchen">
                                        <span className="flex items-center gap-2">
                                            <ChefHat className="w-4 h-4" />
                                            Cuisine
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="bar">
                                        <span className="flex items-center gap-2">
                                            <Wine className="w-4 h-4" />
                                            Bar
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="image_url">URL de l'image</Label>
                            <Input
                                id="image_url"
                                value={formData.image_url}
                                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="is_active">Article actif</Label>
                            <Switch 
                                id="is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                            />
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
        </div>
    );
}
