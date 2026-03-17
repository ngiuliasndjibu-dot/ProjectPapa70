import React, { useState, useEffect } from 'react';
import { usersAPI } from '../lib/api';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
    Users,
    UserPlus,
    Edit,
    Trash2,
    Shield,
    ShieldCheck,
    ShieldX,
    Key,
    Loader2,
    Search,
    ChefHat,
    Wine,
    CreditCard,
    UserCog,
    Eye,
    EyeOff,
    CheckCircle,
    XCircle,
    LayoutDashboard,
    Table2,
    UtensilsCrossed,
    ShoppingCart,
    Package,
    Beaker,
    Printer,
    Settings,
    FileText
} from 'lucide-react';

// Role definitions with icons and colors
const ROLES = {
    admin: { 
        name: 'Administrateur', 
        icon: ShieldCheck, 
        color: 'bg-red-100 text-red-700 border-red-200',
        description: 'Accès total au système'
    },
    cashier: { 
        name: 'Caissier', 
        icon: CreditCard, 
        color: 'bg-green-100 text-green-700 border-green-200',
        description: 'Gestion des paiements et clôture de caisse'
    },
    server: { 
        name: 'Serveur', 
        icon: UserCog, 
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        description: 'Prise de commandes et gestion des tables'
    },
    bartender: { 
        name: 'Barman', 
        icon: Wine, 
        color: 'bg-purple-100 text-purple-700 border-purple-200',
        description: 'Gestion du bar et des boissons'
    },
    kitchen: { 
        name: 'Cuisine', 
        icon: ChefHat, 
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        description: 'Affichage des commandes cuisine'
    }
};

// Permission definitions grouped by module
const PERMISSIONS = {
    dashboard: {
        name: 'Tableau de bord',
        icon: LayoutDashboard,
        permissions: [
            { code: 'dashboard.view', name: 'Voir le tableau de bord' },
            { code: 'dashboard.stats', name: 'Voir les statistiques' }
        ]
    },
    tables: {
        name: 'Tables',
        icon: Table2,
        permissions: [
            { code: 'tables.view', name: 'Voir les tables' },
            { code: 'tables.create', name: 'Créer des tables' },
            { code: 'tables.edit', name: 'Modifier les tables' },
            { code: 'tables.delete', name: 'Supprimer des tables' }
        ]
    },
    menu: {
        name: 'Menu',
        icon: UtensilsCrossed,
        permissions: [
            { code: 'menu.view', name: 'Voir le menu' },
            { code: 'menu.create', name: 'Créer des articles' },
            { code: 'menu.edit', name: 'Modifier des articles' },
            { code: 'menu.delete', name: 'Supprimer des articles' }
        ]
    },
    orders: {
        name: 'Commandes',
        icon: ShoppingCart,
        permissions: [
            { code: 'orders.view', name: 'Voir les commandes' },
            { code: 'orders.create', name: 'Créer des commandes' },
            { code: 'orders.edit', name: 'Modifier des commandes' },
            { code: 'orders.cancel', name: 'Annuler des commandes' }
        ]
    },
    payments: {
        name: 'Paiements',
        icon: CreditCard,
        permissions: [
            { code: 'payments.view', name: 'Voir les paiements' },
            { code: 'payments.create', name: 'Enregistrer des paiements' },
            { code: 'payments.daily_close', name: 'Clôture de caisse' }
        ]
    },
    stock: {
        name: 'Stock',
        icon: Package,
        permissions: [
            { code: 'stock.view', name: 'Voir le stock' },
            { code: 'stock.create', name: 'Ajouter au stock' },
            { code: 'stock.edit', name: 'Modifier le stock' }
        ]
    },
    bottles: {
        name: 'Bouteilles',
        icon: Beaker,
        permissions: [
            { code: 'bottles.view', name: 'Voir les bouteilles' },
            { code: 'bottles.create', name: 'Ajouter des bouteilles' },
            { code: 'bottles.edit', name: 'Modifier des bouteilles' },
            { code: 'bottles.pour', name: 'Enregistrer les services' }
        ]
    },
    printers: {
        name: 'Imprimantes',
        icon: Printer,
        permissions: [
            { code: 'printers.view', name: 'Voir les imprimantes' },
            { code: 'printers.create', name: 'Ajouter des imprimantes' },
            { code: 'printers.edit', name: 'Modifier les imprimantes' },
            { code: 'printers.delete', name: 'Supprimer des imprimantes' }
        ]
    },
    users: {
        name: 'Utilisateurs',
        icon: Users,
        permissions: [
            { code: 'users.view', name: 'Voir les utilisateurs' },
            { code: 'users.create', name: 'Créer des utilisateurs' },
            { code: 'users.edit', name: 'Modifier des utilisateurs' },
            { code: 'users.delete', name: 'Supprimer des utilisateurs' }
        ]
    },
    settings: {
        name: 'Paramètres',
        icon: Settings,
        permissions: [
            { code: 'settings.view', name: 'Voir les paramètres' },
            { code: 'settings.edit', name: 'Modifier les paramètres' }
        ]
    },
    reports: {
        name: 'Rapports',
        icon: FileText,
        permissions: [
            { code: 'reports.view', name: 'Voir les rapports' },
            { code: 'reports.print', name: 'Imprimer les rapports' }
        ]
    }
};

// Role permissions mapping
const ROLE_PERMISSIONS = {
    admin: Object.values(PERMISSIONS).flatMap(m => m.permissions.map(p => p.code)),
    cashier: [
        'dashboard.view', 'dashboard.stats',
        'tables.view',
        'menu.view',
        'orders.view', 'orders.create',
        'payments.view', 'payments.create', 'payments.daily_close',
        'reports.view'
    ],
    server: [
        'tables.view', 'tables.edit',
        'menu.view',
        'orders.view', 'orders.create', 'orders.edit'
    ],
    bartender: [
        'menu.view',
        'orders.view',
        'bottles.view', 'bottles.pour'
    ],
    kitchen: [
        'orders.view'
    ]
};

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showUserDialog, setShowUserDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        password: '',
        role: 'server',
        is_active: true
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const response = await usersAPI.getAll();
            setUsers(response.data);
        } catch (err) {
            toast.error('Erreur lors du chargement des utilisateurs');
        } finally {
            setLoading(false);
        }
    };

    const openCreateDialog = () => {
        setSelectedUser(null);
        setFormData({
            username: '',
            full_name: '',
            password: '',
            role: 'server',
            is_active: true
        });
        setShowPassword(false);
        setShowUserDialog(true);
    };

    const openEditDialog = (user) => {
        setSelectedUser(user);
        setFormData({
            username: user.username,
            full_name: user.full_name,
            password: '',
            role: user.role,
            is_active: user.is_active !== false
        });
        setShowPassword(false);
        setShowUserDialog(true);
    };

    const handleSave = async () => {
        if (!formData.username || !formData.full_name) {
            toast.error('Veuillez remplir tous les champs obligatoires');
            return;
        }

        if (!selectedUser && !formData.password) {
            toast.error('Le mot de passe est obligatoire pour un nouvel utilisateur');
            return;
        }

        try {
            if (selectedUser) {
                // Update existing user
                const updateData = {
                    full_name: formData.full_name,
                    role: formData.role,
                    is_active: formData.is_active
                };
                if (formData.password) {
                    updateData.password = formData.password;
                }
                await usersAPI.update(selectedUser.id, updateData);
                toast.success('Utilisateur mis à jour');
            } else {
                // Create new user
                await usersAPI.create(formData);
                toast.success('Utilisateur créé');
            }
            setShowUserDialog(false);
            loadUsers();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Erreur lors de la sauvegarde');
        }
    };

    const handleToggleStatus = async (user) => {
        try {
            await usersAPI.toggleStatus(user.id);
            toast.success(`Utilisateur ${user.is_active !== false ? 'désactivé' : 'activé'}`);
            loadUsers();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Erreur lors du changement de statut');
        }
    };

    const handleDelete = async () => {
        if (!selectedUser) return;
        
        try {
            await usersAPI.delete(selectedUser.id);
            toast.success('Utilisateur supprimé');
            setShowDeleteDialog(false);
            setSelectedUser(null);
            loadUsers();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Erreur lors de la suppression');
        }
    };

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRoleInfo = (role) => ROLES[role] || ROLES.server;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6" data-testid="users-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                        Gestion des Utilisateurs
                    </h1>
                    <p className="text-stone-500">{users.length} utilisateur(s) enregistré(s)</p>
                </div>
                <Button onClick={openCreateDialog} className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Nouvel utilisateur
                </Button>
            </div>

            <Tabs defaultValue="users" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="users" className="gap-2">
                        <Users className="w-4 h-4" />
                        Utilisateurs
                    </TabsTrigger>
                    <TabsTrigger value="roles" className="gap-2">
                        <Shield className="w-4 h-4" />
                        Rôles & Privilèges
                    </TabsTrigger>
                </TabsList>

                {/* Users Tab */}
                <TabsContent value="users" className="space-y-4">
                    {/* Search */}
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                        <Input
                            placeholder="Rechercher un utilisateur..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Users Table */}
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Utilisateur</TableHead>
                                        <TableHead>Nom complet</TableHead>
                                        <TableHead>Rôle</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.map((user) => {
                                        const roleInfo = getRoleInfo(user.role);
                                        const RoleIcon = roleInfo.icon;
                                        const isActive = user.is_active !== false;
                                        
                                        return (
                                            <TableRow key={user.id} className={cn(!isActive && 'opacity-50')}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            'w-10 h-10 rounded-full flex items-center justify-center',
                                                            roleInfo.color
                                                        )}>
                                                            <RoleIcon className="w-5 h-5" />
                                                        </div>
                                                        <span className="font-medium">{user.username}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{user.full_name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn('gap-1', roleInfo.color)}>
                                                        {roleInfo.name}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {isActive ? (
                                                        <Badge className="bg-green-100 text-green-700 gap-1">
                                                            <CheckCircle className="w-3 h-3" />
                                                            Actif
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="gap-1">
                                                            <XCircle className="w-3 h-3" />
                                                            Inactif
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleToggleStatus(user)}
                                                            title={isActive ? 'Désactiver' : 'Activer'}
                                                        >
                                                            {isActive ? (
                                                                <ShieldX className="w-4 h-4 text-amber-500" />
                                                            ) : (
                                                                <ShieldCheck className="w-4 h-4 text-green-500" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openEditDialog(user)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-500 hover:text-red-700"
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setShowDeleteDialog(true);
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {filteredUsers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-stone-500">
                                                Aucun utilisateur trouvé
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Roles & Permissions Tab */}
                <TabsContent value="roles" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {Object.entries(ROLES).map(([roleCode, role]) => {
                            const RoleIcon = role.icon;
                            const permissions = ROLE_PERMISSIONS[roleCode] || [];
                            
                            return (
                                <Card key={roleCode} className="overflow-hidden">
                                    <CardHeader className={cn('pb-3', role.color.replace('text-', 'bg-').split(' ')[0] + '/20')}>
                                        <div className="flex items-center gap-3">
                                            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', role.color)}>
                                                <RoleIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">{role.name}</CardTitle>
                                                <CardDescription>{role.description}</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <div className="space-y-3">
                                            {Object.entries(PERMISSIONS).map(([moduleCode, module]) => {
                                                const ModuleIcon = module.icon;
                                                const modulePerms = module.permissions.filter(p => 
                                                    permissions.includes(p.code)
                                                );
                                                
                                                if (modulePerms.length === 0) return null;
                                                
                                                return (
                                                    <div key={moduleCode} className="flex items-start gap-2">
                                                        <ModuleIcon className="w-4 h-4 text-stone-400 mt-0.5" />
                                                        <div>
                                                            <p className="text-sm font-medium text-stone-700">{module.name}</p>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {modulePerms.map(perm => (
                                                                    <Badge 
                                                                        key={perm.code} 
                                                                        variant="secondary"
                                                                        className="text-xs font-normal"
                                                                    >
                                                                        {perm.name}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Permissions Legend */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Légende des modules</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {Object.entries(PERMISSIONS).map(([code, module]) => {
                                    const ModuleIcon = module.icon;
                                    return (
                                        <div key={code} className="flex items-center gap-2 text-sm">
                                            <ModuleIcon className="w-4 h-4 text-stone-500" />
                                            <span>{module.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Create/Edit User Dialog */}
            <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedUser 
                                ? 'Modifiez les informations de l\'utilisateur'
                                : 'Créez un nouveau compte utilisateur'
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Nom d'utilisateur *</Label>
                            <Input
                                id="username"
                                placeholder="ex: jean.dupont"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                disabled={!!selectedUser}
                            />
                            {selectedUser && (
                                <p className="text-xs text-stone-500">
                                    Le nom d'utilisateur ne peut pas être modifié
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="full_name">Nom complet *</Label>
                            <Input
                                id="full_name"
                                placeholder="ex: Jean Dupont"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">
                                {selectedUser ? 'Nouveau mot de passe' : 'Mot de passe *'}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder={selectedUser ? 'Laisser vide pour ne pas changer' : 'Mot de passe'}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">Rôle *</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(value) => setFormData({ ...formData, role: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(ROLES).map(([code, role]) => {
                                        const RoleIcon = role.icon;
                                        return (
                                            <SelectItem key={code} value={code}>
                                                <div className="flex items-center gap-2">
                                                    <RoleIcon className="w-4 h-4" />
                                                    <span>{role.name}</span>
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-stone-500">
                                {ROLES[formData.role]?.description}
                            </p>
                        </div>

                        {selectedUser && (
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Compte actif</Label>
                                    <p className="text-xs text-stone-500">
                                        L'utilisateur peut se connecter
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowUserDialog(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleSave}>
                            {selectedUser ? 'Enregistrer' : 'Créer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Supprimer l'utilisateur</DialogTitle>
                        <DialogDescription>
                            Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{selectedUser?.full_name}</strong> ?
                            Cette action est irréversible.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Annuler
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Supprimer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
