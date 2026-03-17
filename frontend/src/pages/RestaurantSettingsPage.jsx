import React, { useState, useEffect } from 'react';
import { restaurantSettingsAPI, loyaltyAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
    Building2, 
    Phone, 
    Mail, 
    Globe, 
    FileText, 
    Save,
    Loader2,
    Gift,
    Star,
    Receipt
} from 'lucide-react';

export default function RestaurantSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        name: '',
        address: '',
        city: '',
        phone: '',
        email: '',
        website: '',
        tax_id: '',
        logo_url: '',
        receipt_footer: 'Merci de votre visite!'
    });
    const [loyaltySettings, setLoyaltySettings] = useState({
        is_enabled: true,
        points_per_unit: 1,
        currency_per_point: 100,
        welcome_bonus: 10
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const [restaurantRes, loyaltyRes] = await Promise.all([
                restaurantSettingsAPI.get(),
                loyaltyAPI.getSettings()
            ]);
            setSettings(restaurantRes.data);
            setLoyaltySettings(loyaltyRes.data);
        } catch (err) {
            toast.error('Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRestaurant = async () => {
        setSaving(true);
        try {
            await restaurantSettingsAPI.update(settings);
            toast.success('Paramètres enregistrés');
        } catch (err) {
            toast.error('Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveLoyalty = async () => {
        setSaving(true);
        try {
            await loyaltyAPI.updateSettings(loyaltySettings);
            toast.success('Paramètres de fidélité enregistrés');
        } catch (err) {
            toast.error('Erreur lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6" data-testid="restaurant-settings-page">
            <div>
                <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Configuration de l'établissement
                </h1>
                <p className="text-stone-500">Paramètres généraux et informations pour les factures</p>
            </div>

            <Tabs defaultValue="restaurant" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="restaurant" className="gap-2">
                        <Building2 className="w-4 h-4" />
                        Établissement
                    </TabsTrigger>
                    <TabsTrigger value="invoice" className="gap-2">
                        <Receipt className="w-4 h-4" />
                        Facture
                    </TabsTrigger>
                    <TabsTrigger value="loyalty" className="gap-2">
                        <Gift className="w-4 h-4" />
                        Fidélité
                    </TabsTrigger>
                </TabsList>

                {/* Restaurant Info Tab */}
                <TabsContent value="restaurant">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informations de l'établissement</CardTitle>
                            <CardDescription>
                                Ces informations apparaîtront sur les factures et tickets
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nom de l'établissement *</Label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                        <Input
                                            id="name"
                                            placeholder="Mon Restaurant"
                                            value={settings.name}
                                            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Téléphone</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                        <Input
                                            id="phone"
                                            placeholder="+243 XXX XXX XXX"
                                            value={settings.phone}
                                            onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="address">Adresse</Label>
                                    <Input
                                        id="address"
                                        placeholder="123 Avenue de la Paix"
                                        value={settings.address}
                                        onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="city">Ville</Label>
                                    <Input
                                        id="city"
                                        placeholder="Kinshasa"
                                        value={settings.city}
                                        onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="contact@restaurant.com"
                                            value={settings.email}
                                            onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="website">Site web</Label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                        <Input
                                            id="website"
                                            placeholder="www.restaurant.com"
                                            value={settings.website}
                                            onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="tax_id">NIF / RCCM</Label>
                                    <div className="relative">
                                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                                        <Input
                                            id="tax_id"
                                            placeholder="Numéro d'identification fiscale"
                                            value={settings.tax_id}
                                            onChange={(e) => setSettings({ ...settings, tax_id: e.target.value })}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={handleSaveRestaurant} disabled={saving}>
                                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Enregistrer
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Invoice Settings Tab */}
                <TabsContent value="invoice">
                    <Card>
                        <CardHeader>
                            <CardTitle>Paramètres de facture</CardTitle>
                            <CardDescription>
                                Personnalisez le message de bas de facture
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="receipt_footer">Message de bas de facture</Label>
                                <Textarea
                                    id="receipt_footer"
                                    placeholder="Merci de votre visite!"
                                    value={settings.receipt_footer}
                                    onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
                                    rows={3}
                                />
                                <p className="text-xs text-stone-500">
                                    Ce message apparaîtra en bas de chaque facture
                                </p>
                            </div>

                            {/* Invoice Preview */}
                            <div className="border rounded-lg p-4 bg-stone-50">
                                <h3 className="font-semibold mb-4">Aperçu de la facture (Imprimante thermique 80mm)</h3>
                                <div className="font-mono text-xs bg-white p-4 rounded border max-w-xs mx-auto" style={{ width: '300px' }}>
                                    <div className="text-center">
                                        <p className="font-bold text-lg">{settings.name || 'MON RESTAURANT'}</p>
                                        {settings.address && <p>{settings.address}</p>}
                                        {settings.city && <p>{settings.city}</p>}
                                        {settings.phone && <p>Tél: {settings.phone}</p>}
                                        {settings.tax_id && <p>NIF: {settings.tax_id}</p>}
                                        <p className="my-2">{'='.repeat(40)}</p>
                                        <p className="font-bold">FACTURE N° FAC-20241217-0001</p>
                                        <p className="my-1">{'-'.repeat(40)}</p>
                                    </div>
                                    <div className="text-left">
                                        <p>Date: 17/12/2024</p>
                                        <p>Heure: 14:30:00</p>
                                        <p>Table: 5</p>
                                        <p>Serveur: Jean</p>
                                        <p className="my-1">{'-'.repeat(40)}</p>
                                        <p className="font-bold">ARTICLES</p>
                                        <p className="my-1">{'-'.repeat(40)}</p>
                                        <p>2x Steak Frites</p>
                                        <p className="text-right">22 000 x 2 = 44 000</p>
                                        <p>1x Salade César</p>
                                        <p className="text-right">8 500 x 1 = 8 500</p>
                                        <p>3x Bière locale</p>
                                        <p className="text-right">3 000 x 3 = 9 000</p>
                                        <p className="my-1">{'='.repeat(40)}</p>
                                        <p>Sous-total: 61 500 FC</p>
                                        <p className="my-1">{'-'.repeat(40)}</p>
                                        <p className="font-bold text-lg">TOTAL: 61 500 FC</p>
                                        <p className="my-1">{'='.repeat(40)}</p>
                                        <p>Mode: Espèces</p>
                                    </div>
                                    <div className="text-center mt-4">
                                        <p>{settings.receipt_footer || 'Merci de votre visite!'}</p>
                                        <p className="text-xs mt-2">17/12/2024 14:30:25</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={handleSaveRestaurant} disabled={saving}>
                                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Enregistrer
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Loyalty Settings Tab */}
                <TabsContent value="loyalty">
                    <Card>
                        <CardHeader>
                            <CardTitle>Programme de fidélité</CardTitle>
                            <CardDescription>
                                Configurez votre système de points de fidélité
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-lg">
                                <div>
                                    <p className="font-medium">Activer le programme de fidélité</p>
                                    <p className="text-sm text-stone-500">Les clients peuvent accumuler des points</p>
                                </div>
                                <Switch
                                    checked={loyaltySettings.is_enabled}
                                    onCheckedChange={(checked) => setLoyaltySettings({ ...loyaltySettings, is_enabled: checked })}
                                />
                            </div>

                            {loyaltySettings.is_enabled && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="currency_per_point">Montant pour 1 point (FC)</Label>
                                        <Input
                                            id="currency_per_point"
                                            type="number"
                                            value={loyaltySettings.currency_per_point}
                                            onChange={(e) => setLoyaltySettings({ ...loyaltySettings, currency_per_point: parseFloat(e.target.value) || 0 })}
                                        />
                                        <p className="text-xs text-stone-500">
                                            Le client gagne 1 point tous les {loyaltySettings.currency_per_point} FC dépensés
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="points_per_unit">Points par unité</Label>
                                        <Input
                                            id="points_per_unit"
                                            type="number"
                                            value={loyaltySettings.points_per_unit}
                                            onChange={(e) => setLoyaltySettings({ ...loyaltySettings, points_per_unit: parseInt(e.target.value) || 1 })}
                                        />
                                        <p className="text-xs text-stone-500">
                                            Nombre de points attribués par unité de dépense
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="welcome_bonus">Bonus de bienvenue (points)</Label>
                                        <Input
                                            id="welcome_bonus"
                                            type="number"
                                            value={loyaltySettings.welcome_bonus}
                                            onChange={(e) => setLoyaltySettings({ ...loyaltySettings, welcome_bonus: parseInt(e.target.value) || 0 })}
                                        />
                                        <p className="text-xs text-stone-500">
                                            Points offerts à l'inscription
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Loyalty Example */}
                            {loyaltySettings.is_enabled && (
                                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Star className="w-5 h-5 text-amber-500" />
                                        <span className="font-semibold text-amber-800">Exemple de calcul</span>
                                    </div>
                                    <p className="text-sm text-amber-700">
                                        Un client qui dépense <strong>10 000 FC</strong> gagnera{' '}
                                        <strong>
                                            {Math.floor((10000 / loyaltySettings.currency_per_point) * loyaltySettings.points_per_unit)} points
                                        </strong>
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button onClick={handleSaveLoyalty} disabled={saving}>
                                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Enregistrer
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
