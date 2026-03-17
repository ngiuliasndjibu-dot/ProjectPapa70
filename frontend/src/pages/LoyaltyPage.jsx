import React, { useState, useEffect } from 'react';
import { loyaltyAPI } from '../lib/api';
import { useCurrency } from '../contexts/CurrencyContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
    Gift, 
    Plus, 
    Star,
    User,
    Phone,
    Search,
    Loader2,
    Award,
    TrendingUp,
    Users
} from 'lucide-react';

export default function LoyaltyPage() {
    const [customers, setCustomers] = useState([]);
    const [rewards, setRewards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCustomerDialog, setShowCustomerDialog] = useState(false);
    const [showRewardDialog, setShowRewardDialog] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '' });
    const [rewardForm, setRewardForm] = useState({ 
        name: '', 
        description: '', 
        points_required: 100, 
        reward_type: 'discount',
        reward_value: 0 
    });

    const { formatPriceSelling } = useCurrency();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [customersRes, rewardsRes] = await Promise.all([
                loyaltyAPI.getCustomers(),
                loyaltyAPI.getRewards()
            ]);
            setCustomers(customersRes.data || []);
            setRewards(rewardsRes.data || []);
        } catch (err) {
            toast.error('Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            loadData();
            return;
        }
        try {
            const res = await loyaltyAPI.getCustomers(searchQuery);
            setCustomers(res.data || []);
        } catch (err) {
            toast.error('Erreur lors de la recherche');
        }
    };

    const handleCreateCustomer = async () => {
        if (!customerForm.name || !customerForm.phone) {
            toast.error('Nom et téléphone obligatoires');
            return;
        }
        try {
            await loyaltyAPI.createCustomer(customerForm);
            toast.success('Client inscrit au programme de fidélité');
            setShowCustomerDialog(false);
            setCustomerForm({ name: '', phone: '', email: '' });
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Erreur lors de l\'inscription');
        }
    };

    const handleCreateReward = async () => {
        if (!rewardForm.name || rewardForm.points_required <= 0) {
            toast.error('Nom et points requis obligatoires');
            return;
        }
        try {
            await loyaltyAPI.createReward(rewardForm);
            toast.success('Récompense créée');
            setShowRewardDialog(false);
            setRewardForm({ name: '', description: '', points_required: 100, reward_type: 'discount', reward_value: 0 });
            loadData();
        } catch (err) {
            toast.error('Erreur lors de la création');
        }
    };

    const handleDeleteReward = async (reward) => {
        if (!window.confirm('Supprimer cette récompense ?')) return;
        try {
            await loyaltyAPI.deleteReward(reward.id);
            toast.success('Récompense supprimée');
            loadData();
        } catch (err) {
            toast.error('Erreur lors de la suppression');
        }
    };

    const handleRedeemPoints = async (customer, reward) => {
        if (customer.points < reward.points_required) {
            toast.error('Points insuffisants');
            return;
        }
        try {
            await loyaltyAPI.redeemPoints(customer.id, reward.points_required, reward.id);
            toast.success('Points échangés avec succès');
            loadData();
        } catch (err) {
            toast.error('Erreur lors de l\'échange');
        }
    };

    const totalPoints = customers.reduce((sum, c) => sum + c.points, 0);
    const totalSpent = customers.reduce((sum, c) => sum + c.total_spent, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6" data-testid="loyalty-page">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                        Programme de Fidélité
                    </h1>
                    <p className="text-stone-500">Gérez vos clients fidèles et leurs récompenses</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowRewardDialog(true)} className="gap-2">
                        <Award className="w-4 h-4" />
                        Nouvelle récompense
                    </Button>
                    <Button onClick={() => setShowCustomerDialog(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Nouveau client
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <Users className="w-8 h-8 text-blue-500" />
                            <div>
                                <p className="text-sm text-stone-500">Clients fidèles</p>
                                <p className="text-2xl font-bold">{customers.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <Star className="w-8 h-8 text-amber-500" />
                            <div>
                                <p className="text-sm text-stone-500">Points en circulation</p>
                                <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="w-8 h-8 text-green-500" />
                            <div>
                                <p className="text-sm text-stone-500">CA fidélité</p>
                                <p className="text-2xl font-bold">{formatPriceSelling(totalSpent)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <Gift className="w-8 h-8 text-purple-500" />
                            <div>
                                <p className="text-sm text-stone-500">Récompenses</p>
                                <p className="text-2xl font-bold">{rewards.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Rewards */}
            <Card>
                <CardHeader>
                    <CardTitle>Récompenses disponibles</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {rewards.map((reward) => (
                            <div key={reward.id} className="p-4 border rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-semibold">{reward.name}</h3>
                                        {reward.description && (
                                            <p className="text-sm text-stone-500">{reward.description}</p>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700"
                                        onClick={() => handleDeleteReward(reward)}
                                    >
                                        ×
                                    </Button>
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                                    <span className="text-lg font-bold">{reward.points_required} points</span>
                                </div>
                            </div>
                        ))}
                        {rewards.length === 0 && (
                            <p className="col-span-3 text-center text-stone-500 py-4">
                                Aucune récompense configurée
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Search */}
            <div className="flex gap-2 max-w-md">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <Input
                        placeholder="Rechercher par nom ou téléphone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="pl-9"
                    />
                </div>
                <Button onClick={handleSearch}>Rechercher</Button>
            </div>

            {/* Customers Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Clients fidèles</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Client</TableHead>
                                <TableHead>Téléphone</TableHead>
                                <TableHead className="text-right">Points</TableHead>
                                <TableHead className="text-right">Total dépensé</TableHead>
                                <TableHead className="text-right">Visites</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customers.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="w-4 h-4 text-primary" />
                                            </div>
                                            <span className="font-medium">{customer.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{customer.phone}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant="secondary" className="gap-1">
                                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                            {customer.points}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {formatPriceSelling(customer.total_spent)}
                                    </TableCell>
                                    <TableCell className="text-right">{customer.visit_count}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedCustomer(customer)}
                                        >
                                            Échanger
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {customers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-stone-500">
                                        Aucun client inscrit
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* New Customer Dialog */}
            <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Inscrire un nouveau client</DialogTitle>
                        <DialogDescription>
                            Ajoutez un client au programme de fidélité
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nom complet *</Label>
                            <Input
                                id="name"
                                placeholder="Jean Dupont"
                                value={customerForm.name}
                                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Téléphone *</Label>
                            <Input
                                id="phone"
                                placeholder="+243 XXX XXX XXX"
                                value={customerForm.phone}
                                onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="email@exemple.com"
                                value={customerForm.email}
                                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCustomerDialog(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleCreateCustomer}>
                            Inscrire
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* New Reward Dialog */}
            <Dialog open={showRewardDialog} onOpenChange={setShowRewardDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Créer une récompense</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="reward_name">Nom de la récompense *</Label>
                            <Input
                                id="reward_name"
                                placeholder="Ex: Dessert offert"
                                value={rewardForm.name}
                                onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                placeholder="Description de la récompense"
                                value={rewardForm.description}
                                onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="points_required">Points requis *</Label>
                            <Input
                                id="points_required"
                                type="number"
                                value={rewardForm.points_required}
                                onChange={(e) => setRewardForm({ ...rewardForm, points_required: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRewardDialog(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleCreateReward}>
                            Créer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Redeem Points Dialog */}
            <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Échanger des points</DialogTitle>
                        <DialogDescription>
                            {selectedCustomer?.name} - {selectedCustomer?.points} points disponibles
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {rewards.filter(r => r.points_required <= (selectedCustomer?.points || 0)).length > 0 ? (
                            <div className="space-y-2">
                                {rewards.filter(r => r.points_required <= (selectedCustomer?.points || 0)).map(reward => (
                                    <div 
                                        key={reward.id}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-stone-50 cursor-pointer"
                                        onClick={() => handleRedeemPoints(selectedCustomer, reward)}
                                    >
                                        <div>
                                            <p className="font-medium">{reward.name}</p>
                                            <p className="text-sm text-stone-500">{reward.points_required} points</p>
                                        </div>
                                        <Button size="sm">Échanger</Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-stone-500 py-4">
                                Pas assez de points pour les récompenses disponibles
                            </p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
