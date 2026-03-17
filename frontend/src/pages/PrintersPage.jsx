import React, { useState, useEffect } from 'react';
import { printersAPI, printJobsAPI } from '../lib/api';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { 
    Printer, 
    Plus, 
    Trash2, 
    RefreshCw,
    CheckCircle,
    XCircle,
    Wifi,
    WifiOff,
    FileText,
    ChefHat,
    Wine,
    Loader2,
    Send
} from 'lucide-react';

export default function PrintersPage() {
    const [printers, setPrinters] = useState([]);
    const [printJobs, setPrintJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [testingPrinter, setTestingPrinter] = useState(null);
    const [newPrinter, setNewPrinter] = useState({
        name: '',
        department: 'kitchen',
        ip_address: '',
        port: 9100,
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [printersRes, jobsRes] = await Promise.all([
                printersAPI.getAll(),
                printJobsAPI.getAll()
            ]);
            setPrinters(printersRes.data);
            setPrintJobs(jobsRes.data);
        } catch (err) {
            toast.error('Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    };

    const handleAddPrinter = async () => {
        if (!newPrinter.name || !newPrinter.ip_address) {
            toast.error('Veuillez remplir tous les champs obligatoires');
            return;
        }

        try {
            await printersAPI.create({
                ...newPrinter,
                status: 'offline'
            });
            toast.success('Imprimante ajoutée');
            setShowAddDialog(false);
            setNewPrinter({ name: '', department: 'kitchen', ip_address: '', port: 9100 });
            loadData();
        } catch (err) {
            toast.error('Erreur lors de l\'ajout');
        }
    };

    const handleDeletePrinter = async (id) => {
        if (!window.confirm('Supprimer cette imprimante ?')) return;
        
        try {
            await printersAPI.delete(id);
            toast.success('Imprimante supprimée');
            loadData();
        } catch (err) {
            toast.error('Erreur lors de la suppression');
        }
    };

    const handleTestConnection = async (printerId) => {
        setTestingPrinter(printerId);
        try {
            const response = await printersAPI.testConnection(printerId);
            if (response.data.status === 'online') {
                toast.success('Imprimante en ligne !');
            } else {
                toast.error(`Imprimante hors ligne: ${response.data.message}`);
            }
            loadData();
        } catch (err) {
            toast.error('Erreur de connexion à l\'imprimante');
        } finally {
            setTestingPrinter(null);
        }
    };

    const handlePrintTest = async (printerId) => {
        setTestingPrinter(printerId);
        try {
            await printersAPI.printTest(printerId);
            toast.success('Page de test envoyée !');
        } catch (err) {
            toast.error('Erreur d\'impression: ' + (err.response?.data?.detail || 'Imprimante non accessible'));
        } finally {
            setTestingPrinter(null);
        }
    };

    const handleExecutePrintJob = async (jobId) => {
        try {
            const result = await printJobsAPI.executePrint(jobId);
            if (result.data.success) {
                toast.success('Ticket imprimé !');
            } else {
                toast.error('Erreur: ' + result.data.error);
            }
            loadData();
        } catch (err) {
            toast.error('Erreur d\'impression');
        }
    };

    const pendingJobs = printJobs.filter(j => j.status === 'pending');

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6" data-testid="printers-page">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                        Imprimantes
                    </h1>
                    <p className="text-stone-500">Gérez vos imprimantes thermiques ESC/POS</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadData}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Actualiser
                    </Button>
                    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" />
                                Ajouter
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Ajouter une imprimante</DialogTitle>
                                <DialogDescription>
                                    Configurez une imprimante thermique réseau (Epson TM-U220 ou compatible ESC/POS)
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Nom de l'imprimante *</Label>
                                    <Input
                                        placeholder="Ex: Imprimante Cuisine"
                                        value={newPrinter.name}
                                        onChange={(e) => setNewPrinter({ ...newPrinter, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Département *</Label>
                                    <Select
                                        value={newPrinter.department}
                                        onValueChange={(value) => setNewPrinter({ ...newPrinter, department: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="kitchen">
                                                <span className="flex items-center gap-2">
                                                    <ChefHat className="w-4 h-4" /> Cuisine
                                                </span>
                                            </SelectItem>
                                            <SelectItem value="bar">
                                                <span className="flex items-center gap-2">
                                                    <Wine className="w-4 h-4" /> Bar
                                                </span>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Adresse IP *</Label>
                                    <Input
                                        placeholder="Ex: 192.168.1.100"
                                        value={newPrinter.ip_address}
                                        onChange={(e) => setNewPrinter({ ...newPrinter, ip_address: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Port</Label>
                                    <Input
                                        type="number"
                                        placeholder="9100"
                                        value={newPrinter.port}
                                        onChange={(e) => setNewPrinter({ ...newPrinter, port: parseInt(e.target.value) || 9100 })}
                                    />
                                    <p className="text-xs text-stone-500">Port standard: 9100</p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                                    Annuler
                                </Button>
                                <Button onClick={handleAddPrinter}>
                                    Ajouter
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Printers List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {printers.length === 0 ? (
                    <Card className="col-span-full">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-stone-500">
                            <Printer className="w-12 h-12 mb-4 opacity-20" />
                            <p>Aucune imprimante configurée</p>
                            <p className="text-sm">Cliquez sur "Ajouter" pour configurer une imprimante</p>
                        </CardContent>
                    </Card>
                ) : (
                    printers.map((printer) => (
                        <Card 
                            key={printer.id} 
                            className={cn(
                                'relative',
                                printer.status === 'online' && 'border-green-200 bg-green-50/30'
                            )}
                            data-testid={`printer-${printer.id}`}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {printer.department === 'kitchen' ? (
                                            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                                <ChefHat className="w-5 h-5 text-amber-600" />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                                <Wine className="w-5 h-5 text-purple-600" />
                                            </div>
                                        )}
                                        <div>
                                            <CardTitle className="text-base">{printer.name}</CardTitle>
                                            <CardDescription className="text-xs">
                                                {printer.ip_address}:{printer.port}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge 
                                        variant={printer.status === 'online' ? 'default' : 'secondary'}
                                        className={cn(
                                            printer.status === 'online' && 'bg-green-500'
                                        )}
                                    >
                                        {printer.status === 'online' ? (
                                            <><Wifi className="w-3 h-3 mr-1" /> En ligne</>
                                        ) : (
                                            <><WifiOff className="w-3 h-3 mr-1" /> Hors ligne</>
                                        )}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleTestConnection(printer.id)}
                                        disabled={testingPrinter === printer.id}
                                    >
                                        {testingPrinter === printer.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <><RefreshCw className="w-4 h-4 mr-1" /> Tester</>
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handlePrintTest(printer.id)}
                                        disabled={testingPrinter === printer.id}
                                    >
                                        <FileText className="w-4 h-4 mr-1" /> Test
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => handleDeletePrinter(printer.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Pending Print Jobs */}
            {pendingJobs.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Travaux d'impression en attente</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingJobs.map((job) => (
                            <Card key={job.id} className="border-amber-200 bg-amber-50/30">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base">
                                                Commande #{job.order_number}
                                            </CardTitle>
                                            <CardDescription>
                                                Table {job.table_number} • {job.department === 'kitchen' ? 'Cuisine' : 'Bar'}
                                            </CardDescription>
                                        </div>
                                        <Badge variant="outline" className="bg-amber-100">
                                            En attente
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-stone-600 mb-3">
                                        {job.items?.length || 0} article(s)
                                    </div>
                                    <Button
                                        size="sm"
                                        className="w-full"
                                        onClick={() => handleExecutePrintJob(job.id)}
                                    >
                                        <Send className="w-4 h-4 mr-2" />
                                        Imprimer
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Instructions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Printer className="w-5 h-5" />
                        Imprimantes compatibles
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-stone-600 space-y-2">
                    <p>Cette application supporte les imprimantes thermiques compatibles ESC/POS connectées en réseau :</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                        <li><strong>Epson TM-U220</strong> (série TM-U)</li>
                        <li><strong>Epson TM-T20</strong> / TM-T88</li>
                        <li><strong>Star TSP100</strong></li>
                        <li>Toute imprimante compatible ESC/POS avec interface réseau</li>
                    </ul>
                    <p className="mt-4">
                        <strong>Configuration requise :</strong> L'imprimante doit être connectée au même réseau 
                        que l'ordinateur et configurée avec une adresse IP statique.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
