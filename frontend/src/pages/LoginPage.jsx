import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { seedAPI } from '../lib/api';
import { Loader2, UtensilsCrossed, AlertCircle, Database } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const user = await login(username, password);
            toast.success(`Bienvenue, ${user.full_name}!`);
            
            // Redirect based on role
            switch (user.role) {
                case 'admin':
                case 'cashier':
                    navigate('/dashboard');
                    break;
                case 'server':
                    navigate('/pos');
                    break;
                case 'bartender':
                    navigate('/bar');
                    break;
                case 'kitchen':
                    navigate('/kitchen');
                    break;
                default:
                    navigate('/dashboard');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSeed = async () => {
        setIsSeeding(true);
        try {
            const response = await seedAPI.seed();
            toast.success('Base de données initialisée avec succès!');
            toast.info('Admin: admin / admin123');
        } catch (err) {
            toast.error('Erreur lors de l\'initialisation');
        } finally {
            setIsSeeding(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left side - Image */}
            <div 
                className="hidden lg:flex lg:w-1/2 relative"
                style={{
                    backgroundImage: 'url(https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-stone-900/80 to-stone-900/40" />
                <div className="relative z-10 flex flex-col justify-end p-12 text-white">
                    <h1 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                        Lumière POS
                    </h1>
                    <p className="text-lg text-stone-300 max-w-md">
                        Système de gestion de restaurant moderne et élégant. Optimisé pour les écrans tactiles.
                    </p>
                </div>
            </div>

            {/* Right side - Login form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-[#FDFBF7]">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
                            <UtensilsCrossed className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                            Lumière POS
                        </h1>
                    </div>

                    <Card className="border-stone-200 shadow-lg">
                        <CardHeader className="space-y-1 pb-4">
                            <CardTitle className="text-2xl" style={{ fontFamily: 'Playfair Display, serif' }}>
                                Connexion
                            </CardTitle>
                            <CardDescription>
                                Entrez vos identifiants pour accéder au système
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <Alert variant="destructive" className="animate-fade-in">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="username">Nom d'utilisateur</Label>
                                    <Input
                                        id="username"
                                        type="text"
                                        placeholder="Entrez votre nom d'utilisateur"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="h-12"
                                        data-testid="login-username"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Mot de passe</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Entrez votre mot de passe"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-12"
                                        data-testid="login-password"
                                        required
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-12 text-base font-medium rounded-full bg-primary hover:bg-primary/90 btn-press"
                                    disabled={isLoading}
                                    data-testid="login-submit"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Connexion...
                                        </>
                                    ) : (
                                        'Se connecter'
                                    )}
                                </Button>
                            </form>

                            <div className="mt-6 pt-6 border-t border-stone-200">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-12 text-base font-medium rounded-full btn-press"
                                    onClick={handleSeed}
                                    disabled={isSeeding}
                                    data-testid="seed-btn"
                                >
                                    {isSeeding ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Initialisation...
                                        </>
                                    ) : (
                                        <>
                                            <Database className="w-4 h-4 mr-2" />
                                            Initialiser la base de données
                                        </>
                                    )}
                                </Button>
                                <p className="text-xs text-stone-500 text-center mt-2">
                                    Crée les données de test (admin: admin / admin123)
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
