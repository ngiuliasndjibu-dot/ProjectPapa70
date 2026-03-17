import React, { useState, useEffect } from 'react';
import { reservationsAPI, tablesAPI } from '../lib/api';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { toast } from 'sonner';
import { format, parseISO, isToday, isTomorrow, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
    CalendarDays, 
    Plus, 
    Clock, 
    Users, 
    Phone, 
    User,
    Loader2,
    Check,
    X,
    AlertCircle,
    Table2,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

const STATUS_CONFIG = {
    pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    confirmed: { label: 'Confirmée', color: 'bg-green-100 text-green-700 border-green-200', icon: Check },
    cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700 border-red-200', icon: X },
    completed: { label: 'Terminée', color: 'bg-stone-100 text-stone-700 border-stone-200', icon: Check },
    no_show: { label: 'Absent', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle },
};

export default function ReservationsPage() {
    const [reservations, setReservations] = useState([]);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDialog, setShowDialog] = useState(false);
    const [editingReservation, setEditingReservation] = useState(null);
    const [formData, setFormData] = useState({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        table_id: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '19:00',
        party_size: 2,
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, [selectedDate]);

    const loadData = async () => {
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const [reservationsRes, tablesRes] = await Promise.all([
                reservationsAPI.getAll(dateStr),
                tablesAPI.getAll()
            ]);
            setReservations(reservationsRes.data || []);
            setTables(tablesRes.data || []);
        } catch (err) {
            toast.error('Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    };

    const openCreateDialog = () => {
        setEditingReservation(null);
        setFormData({
            customer_name: '',
            customer_phone: '',
            customer_email: '',
            table_id: '',
            date: format(selectedDate, 'yyyy-MM-dd'),
            time: '19:00',
            party_size: 2,
            notes: ''
        });
        setShowDialog(true);
    };

    const openEditDialog = (reservation) => {
        setEditingReservation(reservation);
        setFormData({
            customer_name: reservation.customer_name,
            customer_phone: reservation.customer_phone,
            customer_email: reservation.customer_email || '',
            table_id: reservation.table_id,
            date: reservation.date,
            time: reservation.time,
            party_size: reservation.party_size,
            notes: reservation.notes || ''
        });
        setShowDialog(true);
    };

    const handleSave = async () => {
        if (!formData.customer_name || !formData.customer_phone || !formData.table_id) {
            toast.error('Veuillez remplir tous les champs obligatoires');
            return;
        }

        try {
            if (editingReservation) {
                await reservationsAPI.update(editingReservation.id, formData);
                toast.success('Réservation mise à jour');
            } else {
                await reservationsAPI.create(formData);
                toast.success('Réservation créée');
            }
            setShowDialog(false);
            loadData();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Erreur lors de la sauvegarde');
        }
    };

    const handleStatusChange = async (reservation, newStatus) => {
        try {
            await reservationsAPI.updateStatus(reservation.id, newStatus);
            toast.success('Statut mis à jour');
            loadData();
        } catch (err) {
            toast.error('Erreur lors de la mise à jour');
        }
    };

    const handleDelete = async (reservation) => {
        if (!window.confirm('Supprimer cette réservation ?')) return;
        
        try {
            await reservationsAPI.delete(reservation.id);
            toast.success('Réservation supprimée');
            loadData();
        } catch (err) {
            toast.error('Erreur lors de la suppression');
        }
    };

    const getDateLabel = (date) => {
        if (isToday(date)) return "Aujourd'hui";
        if (isTomorrow(date)) return "Demain";
        return format(date, 'EEEE d MMMM', { locale: fr });
    };

    const goToPreviousDay = () => setSelectedDate(addDays(selectedDate, -1));
    const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
    const goToToday = () => setSelectedDate(new Date());

    // Group reservations by time
    const timeSlots = ['12:00', '12:30', '13:00', '13:30', '14:00', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'];
    
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6" data-testid="reservations-page">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                        Réservations
                    </h1>
                    <p className="text-stone-500">Gérez les réservations de tables</p>
                </div>
                <Button onClick={openCreateDialog} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nouvelle réservation
                </Button>
            </div>

            {/* Date Navigation */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm" onClick={goToPreviousDay}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        
                        <div className="flex items-center gap-4">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <CalendarDays className="w-4 h-4" />
                                        <span className="font-semibold capitalize">{getDateLabel(selectedDate)}</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="center">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={(date) => date && setSelectedDate(date)}
                                        locale={fr}
                                    />
                                </PopoverContent>
                            </Popover>
                            
                            {!isToday(selectedDate) && (
                                <Button variant="ghost" size="sm" onClick={goToToday}>
                                    Aujourd'hui
                                </Button>
                            )}
                        </div>
                        
                        <Button variant="ghost" size="sm" onClick={goToNextDay}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold">{reservations.length}</div>
                        <p className="text-sm text-stone-500">Total</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-amber-600">
                            {reservations.filter(r => r.status === 'pending').length}
                        </div>
                        <p className="text-sm text-stone-500">En attente</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-green-600">
                            {reservations.filter(r => r.status === 'confirmed').length}
                        </div>
                        <p className="text-sm text-stone-500">Confirmées</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-bold">
                            {reservations.reduce((sum, r) => sum + r.party_size, 0)}
                        </div>
                        <p className="text-sm text-stone-500">Couverts</p>
                    </CardContent>
                </Card>
            </div>

            {/* Reservations List */}
            <div className="space-y-4">
                {reservations.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-stone-500">
                            <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Aucune réservation pour cette date</p>
                        </CardContent>
                    </Card>
                ) : (
                    reservations.map((reservation) => {
                        const statusConfig = STATUS_CONFIG[reservation.status] || STATUS_CONFIG.pending;
                        const StatusIcon = statusConfig.icon;
                        
                        return (
                            <Card key={reservation.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-16 h-16 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                                                <span className="text-2xl font-bold text-primary">{reservation.time.split(':')[0]}</span>
                                                <span className="text-xs text-primary">:{reservation.time.split(':')[1]}</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-lg">{reservation.customer_name}</h3>
                                                    <Badge variant="outline" className={cn('gap-1', statusConfig.color)}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {statusConfig.label}
                                                    </Badge>
                                                </div>
                                                <div className="flex flex-wrap gap-4 text-sm text-stone-500">
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="w-4 h-4" />
                                                        {reservation.customer_phone}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-4 h-4" />
                                                        {reservation.party_size} personne(s)
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Table2 className="w-4 h-4" />
                                                        Table {reservation.table_number}
                                                    </span>
                                                </div>
                                                {reservation.notes && (
                                                    <p className="mt-2 text-sm text-stone-500 italic">"{reservation.notes}"</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {reservation.status === 'pending' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-green-600 border-green-200 hover:bg-green-50"
                                                    onClick={() => handleStatusChange(reservation, 'confirmed')}
                                                >
                                                    <Check className="w-4 h-4 mr-1" />
                                                    Confirmer
                                                </Button>
                                            )}
                                            {reservation.status === 'confirmed' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleStatusChange(reservation, 'completed')}
                                                >
                                                    Terminée
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => openEditDialog(reservation)}
                                            >
                                                Modifier
                                            </Button>
                                            {reservation.status !== 'cancelled' && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-red-500"
                                                    onClick={() => handleStatusChange(reservation, 'cancelled')}
                                                >
                                                    Annuler
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingReservation ? 'Modifier la réservation' : 'Nouvelle réservation'}
                        </DialogTitle>
                        <DialogDescription>
                            Remplissez les informations de la réservation
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="customer_name">Nom du client *</Label>
                                <Input
                                    id="customer_name"
                                    placeholder="Jean Dupont"
                                    value={formData.customer_name}
                                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="customer_phone">Téléphone *</Label>
                                <Input
                                    id="customer_phone"
                                    placeholder="+243 XXX XXX"
                                    value={formData.customer_phone}
                                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="customer_email">Email</Label>
                            <Input
                                id="customer_email"
                                type="email"
                                placeholder="email@exemple.com"
                                value={formData.customer_email}
                                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="date">Date *</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="time">Heure *</Label>
                                <Select
                                    value={formData.time}
                                    onValueChange={(value) => setFormData({ ...formData, time: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {timeSlots.map(time => (
                                            <SelectItem key={time} value={time}>{time}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="party_size">Nombre de personnes *</Label>
                                <Input
                                    id="party_size"
                                    type="number"
                                    min="1"
                                    value={formData.party_size}
                                    onChange={(e) => setFormData({ ...formData, party_size: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="table_id">Table *</Label>
                                <Select
                                    value={formData.table_id}
                                    onValueChange={(value) => setFormData({ ...formData, table_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tables.map(table => (
                                            <SelectItem key={table.id} value={table.id}>
                                                Table {table.number} ({table.capacity} places)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                placeholder="Remarques spéciales, allergies, etc."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>
                            Annuler
                        </Button>
                        <Button onClick={handleSave}>
                            {editingReservation ? 'Enregistrer' : 'Créer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
