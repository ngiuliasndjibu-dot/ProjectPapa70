import React, { useState, useEffect } from 'react';
import { ingredientsAPI, recipesAPI, menuAPI } from '../lib/api';
import { cn } from '../lib/utils';
import { useCurrency } from '../contexts/CurrencyContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
    Package, 
    Plus, 
    Edit2, 
    Trash2,
    Loader2,
    Search,
    AlertTriangle,
    ChefHat,
    Link,
    Unlink,
    ArrowRight
} from 'lucide-react';

const UNITS = [
    { value: 'kg', label: 'Kilogramme (kg)' },
    { value: 'g', label: 'Gramme (g)' },
    { value: 'l', label: 'Litre (l)' },
    { value: 'ml', label: 'Millilitre (ml)' },
    { value: 'piece', label: 'Pièce' },
    { value: 'portion', label: 'Portion' },
];

export default function IngredientsPage() {
    const [ingredients, setIngredients] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showIngredientDialog, setShowIngredientDialog] = useState(false);
    const [showRecipeDialog, setShowRecipeDialog] = useState(false);
    const [editingIngredient, setEditingIngredient] = useState(null);
    const [selectedMenuItem, setSelectedMenuItem] = useState(null);
    const [recipeIngredients, setRecipeIngredients] = useState([]);
    const [ingredientForm, setIngredientForm] = useState({
        name: '',
        unit: 'g',
        quantity_in_stock: 0,
        cost_per_unit: 0,
        alert_threshold: 10,
        supplier: ''
    });

    const { formatPriceSelling, sellingCurrency } = useCurrency();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [ingredientsRes, recipesRes, menuRes] = await Promise.all([
                ingredientsAPI.getAll(),
                recipesAPI.getAll(),
                menuAPI.getAll()
            ]);
            setIngredients(ingredientsRes.data || []);
            setRecipes(recipesRes.data || []);
            setMenuItems(menuRes.data || []);
        } catch (err) {
            toast.error('Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    };

    const openCreateIngredientDialog = () => {
        setEditingIngredient(null);
        setIngredientForm({
            name: '',
            unit: 'g',
            quantity_in_stock: 0,
            cost_per_unit: 0,
            alert_threshold: 10,
            supplier: ''
        });
        setShowIngredientDialog(true);
    };

    const openEditIngredientDialog = (ingredient) => {
        setEditingIngredient(ingredient);
        setIngredientForm({
            name: ingredient.name,
            unit: ingredient.unit,
            quantity_in_stock: ingredient.quantity_in_stock,
            cost_per_unit: ingredient.cost_per_unit,
            alert_threshold: ingredient.alert_threshold,
            supplier: ingredient.supplier || ''
        });
        setShowIngredientDialog(true);
    };

    const handleSaveIngredient = async () => {
        if (!ingredientForm.name) {
            toast.error('Le nom est obligatoire');
            return;
        }

        try {
            if (editingIngredient) {
                await ingredientsAPI.update(editingIngredient.id, ingredientForm);
                toast.success('Ingrédient mis à jour');
            } else {
                await ingredientsAPI.create(ingredientForm);
                toast.success('Ingrédient créé');
            }
            setShowIngredientDialog(false);
            loadData();
        } catch (err) {
            toast.error('Erreur lors de la sauvegarde');
        }
    };

    const handleDeleteIngredient = async (ingredient) => {
        if (!window.confirm(`Supprimer l'ingrédient "${ingredient.name}" ?`)) return;
        
        try {
            await ingredientsAPI.delete(ingredient.id);
            toast.success('Ingrédient supprimé');
            loadData();
        } catch (err) {
            toast.error('Erreur lors de la suppression');
        }
    };

    const openRecipeDialog = (menuItem) => {
        setSelectedMenuItem(menuItem);
        // Load existing recipe if any
        const existingRecipe = recipes.find(r => r.menu_item_id === menuItem.id);
        if (existingRecipe) {
            setRecipeIngredients(existingRecipe.ingredients || []);
        } else {
            setRecipeIngredients([]);
        }
        setShowRecipeDialog(true);
    };

    const addIngredientToRecipe = () => {
        setRecipeIngredients([
            ...recipeIngredients,
            { ingredient_id: '', ingredient_name: '', quantity: 0, unit: 'g' }
        ]);
    };

    const updateRecipeIngredient = (index, field, value) => {
        const updated = [...recipeIngredients];
        updated[index][field] = value;
        
        // Update ingredient name when ingredient is selected
        if (field === 'ingredient_id') {
            const ingredient = ingredients.find(i => i.id === value);
            if (ingredient) {
                updated[index].ingredient_name = ingredient.name;
                updated[index].unit = ingredient.unit;
            }
        }
        
        setRecipeIngredients(updated);
    };

    const removeRecipeIngredient = (index) => {
        setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
    };

    const handleSaveRecipe = async () => {
        try {
            // Filter out empty ingredients
            const validIngredients = recipeIngredients.filter(i => i.ingredient_id && i.quantity > 0);
            
            if (validIngredients.length === 0) {
                // Delete recipe if no ingredients
                const existingRecipe = recipes.find(r => r.menu_item_id === selectedMenuItem.id);
                if (existingRecipe) {
                    await recipesAPI.delete(existingRecipe.id);
                    toast.success('Recette supprimée');
                }
            } else {
                await recipesAPI.create({
                    menu_item_id: selectedMenuItem.id,
                    menu_item_name: selectedMenuItem.name,
                    ingredients: validIngredients,
                    is_active: true
                });
                toast.success('Recette enregistrée');
            }
            
            setShowRecipeDialog(false);
            loadData();
        } catch (err) {
            toast.error('Erreur lors de la sauvegarde');
        }
    };

    const filteredIngredients = ingredients.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const lowStockIngredients = ingredients.filter(i => 
        i.quantity_in_stock <= i.alert_threshold
    );

    const getRecipeForMenuItem = (menuItemId) => {
        return recipes.find(r => r.menu_item_id === menuItemId);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6" data-testid="ingredients-page">
            <div>
                <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Ingrédients & Recettes
                </h1>
                <p className="text-stone-500">Gérez vos ingrédients et liez-les aux articles du menu</p>
            </div>

            <Tabs defaultValue="ingredients" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="ingredients" className="gap-2">
                        <Package className="w-4 h-4" />
                        Ingrédients ({ingredients.length})
                    </TabsTrigger>
                    <TabsTrigger value="recipes" className="gap-2">
                        <ChefHat className="w-4 h-4" />
                        Recettes ({recipes.length})
                    </TabsTrigger>
                </TabsList>

                {/* Ingredients Tab */}
                <TabsContent value="ingredients" className="space-y-4">
                    {/* Alerts */}
                    {lowStockIngredients.length > 0 && (
                        <Card className="border-amber-200 bg-amber-50">
                            <CardContent className="pt-4">
                                <div className="flex items-center gap-2 text-amber-700">
                                    <AlertTriangle className="w-5 h-5" />
                                    <span className="font-medium">
                                        {lowStockIngredients.length} ingrédient(s) en stock bas
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Search & Add */}
                    <div className="flex gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                            <Input
                                placeholder="Rechercher un ingrédient..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button onClick={openCreateIngredientDialog} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Nouvel ingrédient
                        </Button>
                    </div>

                    {/* Ingredients Table */}
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ingrédient</TableHead>
                                        <TableHead>Stock</TableHead>
                                        <TableHead>Seuil d'alerte</TableHead>
                                        <TableHead>Coût unitaire</TableHead>
                                        <TableHead>Fournisseur</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredIngredients.map((ingredient) => {
                                        const isLowStock = ingredient.quantity_in_stock <= ingredient.alert_threshold;
                                        return (
                                            <TableRow key={ingredient.id} className={cn(isLowStock && 'bg-amber-50')}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {isLowStock && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                                                        <span className="font-medium">{ingredient.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={isLowStock ? 'destructive' : 'secondary'}>
                                                        {ingredient.quantity_in_stock} {ingredient.unit}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{ingredient.alert_threshold} {ingredient.unit}</TableCell>
                                                <TableCell>
                                                    {formatPriceSelling(ingredient.cost_per_unit)}/{ingredient.unit}
                                                </TableCell>
                                                <TableCell>{ingredient.supplier || '-'}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditIngredientDialog(ingredient)}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500"
                                                        onClick={() => handleDeleteIngredient(ingredient)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {filteredIngredients.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-stone-500">
                                                Aucun ingrédient trouvé
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Recipes Tab */}
                <TabsContent value="recipes" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Liaison Menu - Ingrédients</CardTitle>
                            <CardDescription>
                                Liez les articles du menu à leurs ingrédients pour une gestion automatique du stock (facultatif)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Article du menu</TableHead>
                                        <TableHead>Département</TableHead>
                                        <TableHead>Prix</TableHead>
                                        <TableHead>Recette</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {menuItems.map((item) => {
                                        const recipe = getRecipeForMenuItem(item.id);
                                        const hasRecipe = !!recipe;
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {item.department === 'kitchen' ? 'Cuisine' : 'Bar'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{formatPriceSelling(item.price)}</TableCell>
                                                <TableCell>
                                                    {hasRecipe ? (
                                                        <div className="flex items-center gap-2">
                                                            <Link className="w-4 h-4 text-green-500" />
                                                            <span className="text-sm text-green-600">
                                                                {recipe.ingredients.length} ingrédient(s)
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-stone-400">
                                                            <Unlink className="w-4 h-4" />
                                                            <span className="text-sm">Non liée</span>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant={hasRecipe ? "outline" : "default"}
                                                        size="sm"
                                                        onClick={() => openRecipeDialog(item)}
                                                    >
                                                        {hasRecipe ? 'Modifier' : 'Lier'}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Ingredient Dialog */}
            <Dialog open={showIngredientDialog} onOpenChange={setShowIngredientDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingIngredient ? "Modifier l'ingrédient" : "Nouvel ingrédient"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nom *</Label>
                            <Input
                                id="name"
                                placeholder="Ex: Viande de bœuf"
                                value={ingredientForm.name}
                                onChange={(e) => setIngredientForm({ ...ingredientForm, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="unit">Unité</Label>
                                <Select
                                    value={ingredientForm.unit}
                                    onValueChange={(value) => setIngredientForm({ ...ingredientForm, unit: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {UNITS.map(unit => (
                                            <SelectItem key={unit.value} value={unit.value}>
                                                {unit.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="quantity_in_stock">Stock actuel</Label>
                                <Input
                                    id="quantity_in_stock"
                                    type="number"
                                    value={ingredientForm.quantity_in_stock}
                                    onChange={(e) => setIngredientForm({ ...ingredientForm, quantity_in_stock: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cost_per_unit">Coût unitaire ({sellingCurrency?.symbol || 'FC'})</Label>
                                <Input
                                    id="cost_per_unit"
                                    type="number"
                                    value={ingredientForm.cost_per_unit}
                                    onChange={(e) => setIngredientForm({ ...ingredientForm, cost_per_unit: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="alert_threshold">Seuil d'alerte</Label>
                                <Input
                                    id="alert_threshold"
                                    type="number"
                                    value={ingredientForm.alert_threshold}
                                    onChange={(e) => setIngredientForm({ ...ingredientForm, alert_threshold: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="supplier">Fournisseur</Label>
                            <Input
                                id="supplier"
                                placeholder="Nom du fournisseur"
                                value={ingredientForm.supplier}
                                onChange={(e) => setIngredientForm({ ...ingredientForm, supplier: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowIngredientDialog(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleSaveIngredient}>
                            {editingIngredient ? 'Enregistrer' : 'Créer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Recipe Dialog */}
            <Dialog open={showRecipeDialog} onOpenChange={setShowRecipeDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ChefHat className="w-5 h-5" />
                            Recette: {selectedMenuItem?.name}
                        </DialogTitle>
                        <DialogDescription>
                            Définissez les ingrédients nécessaires pour préparer cet article
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
                        {recipeIngredients.map((ri, index) => (
                            <div key={index} className="flex items-center gap-2 p-3 bg-stone-50 rounded-lg">
                                <Select
                                    value={ri.ingredient_id}
                                    onValueChange={(value) => updateRecipeIngredient(index, 'ingredient_id', value)}
                                >
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Sélectionner un ingrédient" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ingredients.map(ing => (
                                            <SelectItem key={ing.id} value={ing.id}>
                                                {ing.name} ({ing.unit})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <ArrowRight className="w-4 h-4 text-stone-400" />
                                <Input
                                    type="number"
                                    placeholder="Qté"
                                    className="w-20"
                                    value={ri.quantity}
                                    onChange={(e) => updateRecipeIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                                />
                                <span className="text-sm text-stone-500 w-12">{ri.unit}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500"
                                    onClick={() => removeRecipeIngredient(index)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={addIngredientToRecipe}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Ajouter un ingrédient
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRecipeDialog(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleSaveRecipe}>
                            Enregistrer la recette
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
