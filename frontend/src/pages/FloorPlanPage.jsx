import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tablesAPI } from '../lib/api';
import { cn, getStatusLabel, getStatusClass } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { 
    Plus, 
    Users, 
    Loader2, 
    Edit2, 
    Trash2, 
    MapPin,
    ShoppingCart
} from 'lucide-react';

export default function FloorPlanPage() {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTable, setSelectedTable] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        number: '',
        zone: 'Intérieur',
        capacity: 4,
        position_x: 50,
        position_y: 50,
    });
    const { isAdmin } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadTables();
        const interval = setInterval(loadTables, 10000);
        return () => clearInterval(interval);
    }, []);

    const loadTables = async () => {
        try {
            const response = await tablesAPI.getAll();
            setTables(response.data);
        } catch (err) {
            console.error('Error loading tables:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleTableClick = (table) => {
        setSelectedTable(table);
    };

    const handleStartOrder = () => {
        if (selectedTable) {
            navigate(`/pos?table=${selectedTable.id}&tableNumber=${selectedTable.number}`);
        }
    };

    const handleStatusChange = async (status) => {
        if (!selectedTable) return;
        try {
            await tablesAPI.update(selectedTable.id, { status });
            toast.success('Statut mis à jour');
            loadTables();
            setSelectedTable(prev => ({ ...prev, status }));
        } catch (err) {
            toast.error('Erreur lors de la mise à jour');
        }
    };

    const openCreateDialog = () => {
        setIsEditing(false);
        setFormData({
            number: tables.length + 1,
            zone: 'Intérieur',
            capacity: 4,
            position_x: Math.random() * 600 + 50,
            position_y: Math.random() * 400 + 50,
        });
        setIsDialogOpen(true);
    };

    const openEditDialog = (table) => {
        setIsEditing(true);
        setFormData({
            number: table.number,
            zone: table.zone,
            capacity: table.capacity,
            position_x: table.position_x,
            position_y: table.position_y,
        });
        setSelectedTable(table);
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        try {
            if (isEditing && selectedTable) {
                await tablesAPI.update(selectedTable.id, formData);
                toast.success('Table mise à jour');
            } else {
                await tablesAPI.create({ ...formData, status: 'free' });
                toast.success('Table créée');
            }
            setIsDialogOpen(false);
            loadTables();
        } catch (err) {
            toast.error('Erreur lors de l\'enregistrement');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette table?')) return;
        try {
            await tablesAPI.delete(id);
            toast.success('Table supprimée');
            setSelectedTable(null);
            loadTables();
        } catch (err) {
            toast.error('Erreur lors de la suppression');
        }
    };

    const zones = ['Terrasse', 'Intérieur', 'VIP'];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8" data-testid="floor-plan-page">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl lg:text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                        Plan des tables
                    </h1>
                    <p className="text-stone-500 mt-1">Gérez l'agencement de votre salle</p>
                </div>
                {isAdmin() && (
                    <Button 
                        onClick={openCreateDialog}
                        className="rounded-full px-6 h-12 btn-press"
                        data-testid="add-table-btn"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter une table
                    </Button>
                )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-500" />
                    <span className="text-sm text-stone-600">Libre</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-primary/10 border-2 border-primary" />
                    <span className="text-sm text-stone-600">Occupée</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-amber-100 border-2 border-amber-500" />
                    <span className="text-sm text-stone-600">Réservée</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-100 border-2 border-blue-500" />
                    <span className="text-sm text-stone-600">Nettoyage</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Floor Plan */}
                <div className="lg:col-span-3">
                    <div className="relative w-full h-[600px] bg-stone-50 rounded-xl border-2 border-dashed border-stone-200 overflow-hidden">
                        {tables.map((table) => (
                            <button
                                key={table.id}
                                onClick={() => handleTableClick(table)}
                                className={cn(
                                    'absolute bg-white border-2 rounded-lg shadow-sm flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-md touch-target',
                                    getStatusClass(table.status),
                                    selectedTable?.id === table.id && 'ring-2 ring-primary ring-offset-2'
                                )}
                                style={{
                                    left: `${(table.position_x / 800) * 100}%`,
                                    top: `${(table.position_y / 600) * 100}%`,
                                    width: table.capacity <= 2 ? '80px' : table.capacity <= 4 ? '100px' : '120px',
                                    height: table.capacity <= 2 ? '80px' : table.capacity <= 4 ? '100px' : '120px',
                                }}
                                data-testid={`table-${table.number}`}
                            >
                                <span className="text-2xl font-bold">{table.number}</span>
                                <div className="flex items-center gap-1 mt-1">
                                    <Users className="w-3 h-3" />
                                    <span className="text-xs">{table.capacity}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table Details */}
                <div className="lg:col-span-1">
                    <Card className="border-stone-100 shadow-sm sticky top-6">
                        <CardHeader>
                            <CardTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                                {selectedTable ? `Table ${selectedTable.number}` : 'Sélectionnez une table'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedTable ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-stone-500">Zone</span>
                                            <span className="font-medium flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {selectedTable.zone}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-stone-500">Capacité</span>
                                            <span className="font-medium flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {selectedTable.capacity} personnes
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-stone-500">Statut</span>
                                            <Badge className={getStatusClass(selectedTable.status)}>
                                                {getStatusLabel(selectedTable.status)}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-4 border-t">
                                        <Label className="text-xs text-stone-500">Changer le statut</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['free', 'occupied', 'reserved', 'cleaning'].map((status) => (
                                                <Button
                                                    key={status}
                                                    variant={selectedTable.status === status ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => handleStatusChange(status)}
                                                    className="text-xs h-9 btn-press"
                                                >
                                                    {getStatusLabel(status)}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-4 border-t">
                                        <Button 
                                            onClick={handleStartOrder}
                                            className="w-full rounded-full h-12 btn-press"
                                            disabled={selectedTable.status === 'cleaning'}
                                            data-testid="start-order-btn"
                                        >
                                            <ShoppingCart className="w-4 h-4 mr-2" />
                                            {selectedTable.status === 'occupied' ? 'Voir la commande' : 'Nouvelle commande'}
                                        </Button>
                                        
                                        {isAdmin() && (
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openEditDialog(selectedTable)}
                                                    className="flex-1"
                                                >
                                                    <Edit2 className="w-4 h-4 mr-1" />
                                                    Modifier
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDelete(selectedTable.id)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-stone-500 text-center py-8">
                                    Cliquez sur une table pour voir les détails
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
                            {isEditing ? 'Modifier la table' : 'Nouvelle table'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="number">Numéro</Label>
                                <Input
                                    id="number"
                                    type="number"
                                    value={formData.number}
                                    onChange={(e) => setFormData(prev => ({ ...prev, number: parseInt(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="capacity">Capacité</Label>
                                <Input
                                    id="capacity"
                                    type="number"
                                    value={formData.capacity}
                                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="zone">Zone</Label>
                            <Select 
                                value={formData.zone} 
                                onValueChange={(value) => setFormData(prev => ({ ...prev, zone: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionnez une zone" />
                                </SelectTrigger>
                                <SelectContent>
                                    {zones.map((zone) => (
                                        <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleSubmit} className="rounded-full px-6">
                            {isEditing ? 'Enregistrer' : 'Créer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
