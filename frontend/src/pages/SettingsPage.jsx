import React, { useState, useEffect } from 'react';
import { usersAPI, printersAPI } from '../lib/api';
import { getRoleLabel, getDepartmentLabel } from '../lib/utils';
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
    WifiOff
} from 'lucide-react';

export default function SettingsPage() {
    const [users, setUsers] = useState([]);
    const [printers, setPrinters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
    const [isPrinterDialogOpen, setIsPrinterDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editingPrinter, setEditingPrinter] = useState(null);
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
    const { isAdmin } = useAuth();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [usersRes, printersRes] = await Promise.all([
                usersAPI.getAll(),
                printersAPI.getAll()
            ]);
            setUsers(usersRes.data);
            setPrinters(printersRes.data);
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

            <Tabs defaultValue="users" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="users" className="gap-2">
                        <Users className="w-4 h-4" />
                        Utilisateurs
                    </TabsTrigger>
                    <TabsTrigger value="printers" className="gap-2">
                        <Printer className="w-4 h-4" />
                        Imprimantes
                    </TabsTrigger>
                </TabsList>

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
                                    {printers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-stone-500">
                                                <Printer className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                                Aucune imprimante configurée
                                            </TableCell>
                                        </TableRow>
                                    )}
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
        </div>
    );
}
