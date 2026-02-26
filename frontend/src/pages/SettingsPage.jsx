import React, { useState, useEffect } from 'react';
import { usersAPI, printersAPI, currencyAPI, menuAPI } from '../lib/api';
import { getRoleLabel, getDepartmentLabel, formatPrice } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { 
    Plus, 
    Edit2, 
    Trash2,
    Users,
    Printer,
    Loader2,
    User,
    ChefHat,
    Wine,
    Wifi,
    WifiOff,
    DollarSign,
    FolderTree,
    Layers
} from 'lucide-react';

export default function SettingsPage() {
    const [users, setUsers] = useState([]);
    const [printers, setPrinters] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [families, setFamilies] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
    const [isPrinterDialogOpen, setIsPrinterDialogOpen] = useState(false);
    const [isCurrencyDialogOpen, setIsCurrencyDialogOpen] = useState(false);
    const [isFamilyDialogOpen, setIsFamilyDialogOpen] = useState(false);
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editingPrinter, setEditingPrinter] = useState(null);
    const [editingCurrency, setEditingCurrency] = useState(null);
    const [editingFamily, setEditingFamily] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    const [userFormData, setUserFormData] = useState({
        full_name: '',
        role: 'server',
        is_active: true,
    });
    const [printerFormData, setPrinterFormData] = useState({
        name: '',
        department: 'kitchen',
        ip_address: '',
        port: 9100,
        status: 'online',
    });
    const [currencyFormData, setCurrencyFormData] = useState({
        code: '',
        name: '',
        symbol: '',
        decimal_places: 0,
        is_reference: false,
        is_selling: false,
        exchange_rate: 1.0,
    });
    const [familyFormData, setFamilyFormData] = useState({
        name: '',
        description: '',
        display_order: 0,
    });
    const [categoryFormData, setCategoryFormData] = useState({
        name: '',
        family_id: '',
        description: '',
        display_order: 0,
    });
    const { isAdmin } = useAuth();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [usersRes, printersRes, currenciesRes, familiesRes, categoriesRes] = await Promise.all([
                usersAPI.getAll(),
                printersAPI.getAll(),
                currencyAPI.getAll(),
                menuAPI.getFamilies(),
                menuAPI.getCategoriesFull()
            ]);
            setUsers(usersRes.data);
            setPrinters(printersRes.data);
            setCurrencies(currenciesRes.data);
            setFamilies(familiesRes.data);
            setCategories(categoriesRes.data);
        } catch (err) {
            toast.error('Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    };

    // User handlers
    const openEditUserDialog = (user) => {
        setEditingUser(user);
        setUserFormData({
            full_name: user.full_name,
            role: user.role,
            is_active: user.is_active,
        });
        setIsUserDialogOpen(true);
    };

    const handleUserSubmit = async () => {
        try {
            await usersAPI.update(editingUser.id, userFormData);
            toast.success('Utilisateur mis à jour');
            setIsUserDialogOpen(false);
            loadData();
        } catch (err) {
            toast.error('Erreur lors de la mise à jour');
        }
    };

    const toggleUserActive = async (user) => {
        try {
            await usersAPI.update(user.id, { is_active: !user.is_active });
            toast.success(user.is_active ? 'Utilisateur désactivé' : 'Utilisateur activé');
            loadData();
        } catch (err) {
            toast.error('Erreur lors de la mise à jour');
        }
    };

    // Printer handlers
    const openCreatePrinterDialog = () => {
        setEditingPrinter(null);
        setPrinterFormData({
            name: '',
            department: 'kitchen',
            ip_address: '',
            port: 9100,
            status: 'online',
        });
        setIsPrinterDialogOpen(true);
    };

    const openEditPrinterDialog = (printer) => {
        setEditingPrinter(printer);
        setPrinterFormData({
            name: printer.name,
            department: printer.department,
            ip_address: printer.ip_address,
            port: printer.port,
            status: printer.status,
        });
        setIsPrinterDialogOpen(true);
    };

    const handlePrinterSubmit = async () => {
        try {
            if (editingPrinter) {
                await printersAPI.update(editingPrinter.id, printerFormData);
                toast.success('Imprimante mise à jour');
            } else {
                await printersAPI.create(printerFormData);
                toast.success('Imprimante ajoutée');
            }
            setIsPrinterDialogOpen(false);
            loadData();
        } catch (err) {
            toast.error('Erreur lors de l\'enregistrement');
        }
    };

    const handleDeletePrinter = async (id) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette imprimante?')) return;
        try {
            await printersAPI.delete(id);
            toast.success('Imprimante supprimée');
            loadData();
        } catch (err) {
            toast.error('Erreur lors de la suppression');
        }
    };

    const togglePrinterStatus = async (printer) => {
        try {
            const newStatus = printer.status === 'online' ? 'offline' : 'online';
            await printersAPI.update(printer.id, { status: newStatus });
            toast.success(`Imprimante ${newStatus === 'online' ? 'en ligne' : 'hors ligne'}`);
            loadData();
        } catch (err) {
            toast.error('Erreur lors de la mise à jour');
        }
    };

    // Currency handlers
    const openCreateCurrencyDialog = () => {
        setEditingCurrency(null);
        setCurrencyFormData({
            code: '',
            name: '',
            symbol: '',
            decimal_places: 0,
            is_reference: false,
            is_selling: false,
            exchange_rate: 1.0,
        });
        setIsCurrencyDialogOpen(true);
    };

    const openEditCurrencyDialog = (currency) => {
        setEditingCurrency(currency);
        setCurrencyFormData({
            code: currency.code,
            name: currency.name,
            symbol: currency.symbol,
            decimal_places: currency.decimal_places,
            is_reference: currency.is_reference,
            is_selling: currency.is_selling,
            exchange_rate: currency.exchange_rate,
        });
        setIsCurrencyDialogOpen(true);
    };

    const handleCurrencySubmit = async () => {
        try {
            if (editingCurrency) {
                await currencyAPI.update(editingCurrency.id, currencyFormData);
                toast.success('Devise mise à jour');
            } else {
                await currencyAPI.create(currencyFormData);
                toast.success('Devise ajoutée');
            }
            setIsCurrencyDialogOpen(false);
            loadData();
        } catch (err) {
            toast.error('Erreur lors de l\'enregistrement');
        }
    };

    const handleDeleteCurrency = async (id) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette devise?')) return;
        try {
            await currencyAPI.delete(id);
            toast.success('Devise supprimée');
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Erreur lors de la suppression');
        }
    };

    // Family handlers
    const openCreateFamilyDialog = () => {
        setEditingFamily(null);
        setFamilyFormData({ name: '', description: '', display_order: families.length });
        setIsFamilyDialogOpen(true);
    };

    const openEditFamilyDialog = (family) => {
        setEditingFamily(family);
        setFamilyFormData({
            name: family.name,
            description: family.description || '',
            display_order: family.display_order || 0,
        });
        setIsFamilyDialogOpen(true);
    };

    const handleFamilySubmit = async () => {
        try {
            if (editingFamily) {
                await menuAPI.updateFamily(editingFamily.id, familyFormData);
                toast.success('Famille mise à jour');
            } else {
                await menuAPI.createFamily(familyFormData);
                toast.success('Famille créée');
            }
            setIsFamilyDialogOpen(false);
            loadData();
        } catch (err) {
            toast.error('Erreur lors de l\'enregistrement');
        }
    };

    const handleDeleteFamily = async (id) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette famille?')) return;
        try {
            await menuAPI.deleteFamily(id);
            toast.success('Famille supprimée');
            loadData();
        } catch (err) {
            toast.error('Erreur lors de la suppression');
        }
    };

    // Category handlers
    const openCreateCategoryDialog = () => {
        setEditingCategory(null);
        setCategoryFormData({ 
            name: '', 
            family_id: families[0]?.id || '', 
            description: '', 
            display_order: categories.length 
        });
        setIsCategoryDialogOpen(true);
    };

    const openEditCategoryDialog = (category) => {
        setEditingCategory(category);
        setCategoryFormData({
            name: category.name,
            family_id: category.family_id,
            description: category.description || '',
            display_order: category.display_order || 0,
        });
        setIsCategoryDialogOpen(true);
    };

    const handleCategorySubmit = async () => {
        try {
            if (editingCategory) {
                await menuAPI.updateCategory(editingCategory.id, categoryFormData);
                toast.success('Catégorie mise à jour');
            } else {
                await menuAPI.createCategory(categoryFormData);
                toast.success('Catégorie créée');
            }
            setIsCategoryDialogOpen(false);
            loadData();
        } catch (err) {
            toast.error('Erreur lors de l\'enregistrement');
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie?')) return;
        try {
            await menuAPI.deleteCategory(id);
            toast.success('Catégorie supprimée');
            loadData();
        } catch (err) {
            toast.error('Erreur lors de la suppression');
        }
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'admin': return <User className="w-4 h-4" />;
            case 'server': return <User className="w-4 h-4" />;
            case 'bartender': return <Wine className="w-4 h-4" />;
            case 'kitchen': return <ChefHat className="w-4 h-4" />;
            case 'cashier': return <User className="w-4 h-4" />;
            default: return <User className="w-4 h-4" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8" data-testid="settings-page">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl lg:text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Paramètres
                </h1>
                <p className="text-stone-500 mt-1">Configuration du système</p>
            </div>

            <Tabs defaultValue="currencies" className="space-y-6">
                <TabsList className="flex-wrap h-auto gap-2">
                    <TabsTrigger value="currencies" className="gap-2">
                        <DollarSign className="w-4 h-4" />
                        Devises
                    </TabsTrigger>
                    <TabsTrigger value="families" className="gap-2">
                        <FolderTree className="w-4 h-4" />
                        Familles
                    </TabsTrigger>
                    <TabsTrigger value="categories" className="gap-2">
                        <Layers className="w-4 h-4" />
                        Catégories
                    </TabsTrigger>
                    <TabsTrigger value="users" className="gap-2">
                        <Users className="w-4 h-4" />
                        Utilisateurs
                    </TabsTrigger>
                    <TabsTrigger value="printers" className="gap-2">
                        <Printer className="w-4 h-4" />
                        Imprimantes
                    </TabsTrigger>
                </TabsList>

                {/* Currencies Tab */}
                <TabsContent value="currencies">
                    <Card className="border-stone-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                                    Gestion des devises
                                </CardTitle>
                                <p className="text-sm text-stone-500 mt-1">
                                    Configurez la devise de référence et la devise de vente
                                </p>
                            </div>
                            <Button 
                                onClick={openCreateCurrencyDialog}
                                className="rounded-full"
                                size="sm"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Ajouter
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Nom</TableHead>
                                        <TableHead>Symbole</TableHead>
                                        <TableHead>Taux de change</TableHead>
                                        <TableHead className="text-center">Référence</TableHead>
                                        <TableHead className="text-center">Vente</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currencies.map((currency) => (
                                        <TableRow key={currency.id}>
                                            <TableCell>
                                                <span className="font-mono font-bold">{currency.code}</span>
                                            </TableCell>
                                            <TableCell>{currency.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{currency.symbol}</Badge>
                                            </TableCell>
                                            <TableCell className="font-mono">
                                                {currency.exchange_rate}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {currency.is_reference && (
                                                    <Badge className="bg-blue-100 text-blue-800">Oui</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {currency.is_selling && (
                                                    <Badge className="bg-green-100 text-green-800">Oui</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditCurrencyDialog(currency)}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDeleteCurrency(currency.id)}
                                                        disabled={currency.is_reference || currency.is_selling}
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
                </TabsContent>

                {/* Families Tab */}
                <TabsContent value="families">
                    <Card className="border-stone-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                                    Familles de produits
                                </CardTitle>
                                <p className="text-sm text-stone-500 mt-1">
                                    Regroupement principal des articles (ex: Cuisine, Bar)
                                </p>
                            </div>
                            <Button 
                                onClick={openCreateFamilyDialog}
                                className="rounded-full"
                                size="sm"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Ajouter
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nom</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Ordre</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {families.map((family) => (
                                        <TableRow key={family.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                        <FolderTree className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <span className="font-medium">{family.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-stone-500">
                                                {family.description || '-'}
                                            </TableCell>
                                            <TableCell>{family.display_order}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditFamilyDialog(family)}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDeleteFamily(family.id)}
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
                </TabsContent>

                {/* Categories Tab */}
                <TabsContent value="categories">
                    <Card className="border-stone-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                                    Catégories de produits
                                </CardTitle>
                                <p className="text-sm text-stone-500 mt-1">
                                    Sous-groupes au sein des familles (ex: Entrées, Plats, Cocktails)
                                </p>
                            </div>
                            <Button 
                                onClick={openCreateCategoryDialog}
                                className="rounded-full"
                                size="sm"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Ajouter
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nom</TableHead>
                                        <TableHead>Famille</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Ordre</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categories.map((category) => (
                                        <TableRow key={category.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center">
                                                        <Layers className="w-5 h-5 text-stone-500" />
                                                    </div>
                                                    <span className="font-medium">{category.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{category.family_name}</Badge>
                                            </TableCell>
                                            <TableCell className="text-stone-500">
                                                {category.description || '-'}
                                            </TableCell>
                                            <TableCell>{category.display_order}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditCategoryDialog(category)}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDeleteCategory(category.id)}
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
                </TabsContent>

                {/* Users Tab */}
                <TabsContent value="users">
                    <Card className="border-stone-100 shadow-sm">
                        <CardHeader>
                            <CardTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                                Gestion des utilisateurs
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Utilisateur</TableHead>
                                        <TableHead>Nom d'utilisateur</TableHead>
                                        <TableHead>Rôle</TableHead>
                                        <TableHead className="text-center">Actif</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                                                        {getRoleIcon(user.role)}
                                                    </div>
                                                    <span className="font-medium">{user.full_name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-stone-500">@{user.username}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {getRoleLabel(user.role)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Switch 
                                                    checked={user.is_active}
                                                    onCheckedChange={() => toggleUserActive(user)}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditUserDialog(user)}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Printers Tab */}
                <TabsContent value="printers">
                    <Card className="border-stone-100 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                                Gestion des imprimantes
                            </CardTitle>
                            <Button 
                                onClick={openCreatePrinterDialog}
                                className="rounded-full"
                                size="sm"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Ajouter
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Imprimante</TableHead>
                                        <TableHead>Département</TableHead>
                                        <TableHead>Adresse IP</TableHead>
                                        <TableHead>Port</TableHead>
                                        <TableHead className="text-center">Statut</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {printers.map((printer) => (
                                        <TableRow key={printer.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center">
                                                        <Printer className="w-5 h-5 text-stone-500" />
                                                    </div>
                                                    <span className="font-medium">{printer.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={printer.department === 'kitchen' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}>
                                                    {printer.department === 'kitchen' ? (
                                                        <ChefHat className="w-3 h-3 mr-1" />
                                                    ) : (
                                                        <Wine className="w-3 h-3 mr-1" />
                                                    )}
                                                    {getDepartmentLabel(printer.department)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {printer.ip_address}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {printer.port}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => togglePrinterStatus(printer)}
                                                    className={printer.status === 'online' ? 'text-green-600' : 'text-red-600'}
                                                >
                                                    {printer.status === 'online' ? (
                                                        <>
                                                            <Wifi className="w-4 h-4 mr-1" />
                                                            En ligne
                                                        </>
                                                    ) : (
                                                        <>
                                                            <WifiOff className="w-4 h-4 mr-1" />
                                                            Hors ligne
                                                        </>
                                                    )}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditPrinterDialog(printer)}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDeletePrinter(printer.id)}
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
                </TabsContent>
            </Tabs>

            {/* User Edit Dialog */}
            <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                            Modifier l'utilisateur
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="full_name">Nom complet</Label>
                            <Input
                                id="full_name"
                                value={userFormData.full_name}
                                onChange={(e) => setUserFormData(prev => ({ ...prev, full_name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Rôle</Label>
                            <Select 
                                value={userFormData.role} 
                                onValueChange={(value) => setUserFormData(prev => ({ ...prev, role: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Administrateur</SelectItem>
                                    <SelectItem value="cashier">Caissier</SelectItem>
                                    <SelectItem value="server">Serveur</SelectItem>
                                    <SelectItem value="bartender">Barman</SelectItem>
                                    <SelectItem value="kitchen">Cuisine</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="is_active">Compte actif</Label>
                            <Switch 
                                id="is_active"
                                checked={userFormData.is_active}
                                onCheckedChange={(checked) => setUserFormData(prev => ({ ...prev, is_active: checked }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleUserSubmit} className="rounded-full px-6">
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Printer Dialog */}
            <Dialog open={isPrinterDialogOpen} onOpenChange={setIsPrinterDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                            {editingPrinter ? 'Modifier l\'imprimante' : 'Nouvelle imprimante'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="printer_name">Nom</Label>
                            <Input
                                id="printer_name"
                                value={printerFormData.name}
                                onChange={(e) => setPrinterFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Ex: Imprimante Cuisine"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="department">Département</Label>
                            <Select 
                                value={printerFormData.department} 
                                onValueChange={(value) => setPrinterFormData(prev => ({ ...prev, department: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="kitchen">Cuisine</SelectItem>
                                    <SelectItem value="bar">Bar</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="ip_address">Adresse IP</Label>
                                <Input
                                    id="ip_address"
                                    value={printerFormData.ip_address}
                                    onChange={(e) => setPrinterFormData(prev => ({ ...prev, ip_address: e.target.value }))}
                                    placeholder="192.168.1.100"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="port">Port</Label>
                                <Input
                                    id="port"
                                    type="number"
                                    value={printerFormData.port}
                                    onChange={(e) => setPrinterFormData(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPrinterDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handlePrinterSubmit} className="rounded-full px-6">
                            {editingPrinter ? 'Enregistrer' : 'Créer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Currency Dialog */}
            <Dialog open={isCurrencyDialogOpen} onOpenChange={setIsCurrencyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                            {editingCurrency ? 'Modifier la devise' : 'Nouvelle devise'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="code">Code ISO</Label>
                                <Input
                                    id="code"
                                    value={currencyFormData.code}
                                    onChange={(e) => setCurrencyFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                    placeholder="XOF"
                                    maxLength={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="symbol">Symbole</Label>
                                <Input
                                    id="symbol"
                                    value={currencyFormData.symbol}
                                    onChange={(e) => setCurrencyFormData(prev => ({ ...prev, symbol: e.target.value }))}
                                    placeholder="FCFA"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currency_name">Nom</Label>
                            <Input
                                id="currency_name"
                                value={currencyFormData.name}
                                onChange={(e) => setCurrencyFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Franc CFA"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="exchange_rate">Taux de change</Label>
                                <Input
                                    id="exchange_rate"
                                    type="number"
                                    step="0.00001"
                                    value={currencyFormData.exchange_rate}
                                    onChange={(e) => setCurrencyFormData(prev => ({ ...prev, exchange_rate: parseFloat(e.target.value) }))}
                                />
                                <p className="text-xs text-stone-500">Par rapport à la devise de référence</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="decimal_places">Décimales</Label>
                                <Input
                                    id="decimal_places"
                                    type="number"
                                    value={currencyFormData.decimal_places}
                                    onChange={(e) => setCurrencyFormData(prev => ({ ...prev, decimal_places: parseInt(e.target.value) }))}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <Label htmlFor="is_reference">Devise de référence</Label>
                            <Switch 
                                id="is_reference"
                                checked={currencyFormData.is_reference}
                                onCheckedChange={(checked) => setCurrencyFormData(prev => ({ ...prev, is_reference: checked }))}
                            />
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <Label htmlFor="is_selling">Devise de vente</Label>
                            <Switch 
                                id="is_selling"
                                checked={currencyFormData.is_selling}
                                onCheckedChange={(checked) => setCurrencyFormData(prev => ({ ...prev, is_selling: checked }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCurrencyDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleCurrencySubmit} className="rounded-full px-6">
                            {editingCurrency ? 'Enregistrer' : 'Créer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Family Dialog */}
            <Dialog open={isFamilyDialogOpen} onOpenChange={setIsFamilyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                            {editingFamily ? 'Modifier la famille' : 'Nouvelle famille'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="family_name">Nom</Label>
                            <Input
                                id="family_name"
                                value={familyFormData.name}
                                onChange={(e) => setFamilyFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Ex: Cuisine, Bar"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="family_description">Description</Label>
                            <Input
                                id="family_description"
                                value={familyFormData.description}
                                onChange={(e) => setFamilyFormData(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="family_order">Ordre d'affichage</Label>
                            <Input
                                id="family_order"
                                type="number"
                                value={familyFormData.display_order}
                                onChange={(e) => setFamilyFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFamilyDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleFamilySubmit} className="rounded-full px-6">
                            {editingFamily ? 'Enregistrer' : 'Créer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Category Dialog */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                            {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="category_name">Nom</Label>
                            <Input
                                id="category_name"
                                value={categoryFormData.name}
                                onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Ex: Entrées, Cocktails"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category_family">Famille</Label>
                            <Select 
                                value={categoryFormData.family_id} 
                                onValueChange={(value) => setCategoryFormData(prev => ({ ...prev, family_id: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionnez une famille" />
                                </SelectTrigger>
                                <SelectContent>
                                    {families.map(fam => (
                                        <SelectItem key={fam.id} value={fam.id}>{fam.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category_description">Description</Label>
                            <Input
                                id="category_description"
                                value={categoryFormData.description}
                                onChange={(e) => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category_order">Ordre d'affichage</Label>
                            <Input
                                id="category_order"
                                type="number"
                                value={categoryFormData.display_order}
                                onChange={(e) => setCategoryFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleCategorySubmit} className="rounded-full px-6">
                            {editingCategory ? 'Enregistrer' : 'Créer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
