import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { ConnectionStatusCompact } from '../offline/ConnectionStatus';
import {
    LayoutDashboard,
    Grid3X3,
    ShoppingCart,
    ChefHat,
    Wine,
    UtensilsCrossed,
    Package,
    Beaker,
    CreditCard,
    Settings,
    LogOut,
    User,
    Printer,
    Users,
} from 'lucide-react';

const navItems = [
    { path: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['admin', 'cashier'] },
    { path: '/floor-plan', label: 'Plan des tables', icon: Grid3X3, roles: ['admin', 'server', 'cashier'] },
    { path: '/pos', label: 'Point de vente', icon: ShoppingCart, roles: ['admin', 'server', 'cashier'] },
    { path: '/kitchen', label: 'Cuisine', icon: ChefHat, roles: ['admin', 'kitchen'] },
    { path: '/bar', label: 'Bar', icon: Wine, roles: ['admin', 'bartender'] },
    { path: '/menu', label: 'Menu', icon: UtensilsCrossed, roles: ['admin'] },
    { path: '/stock', label: 'Stock', icon: Package, roles: ['admin'] },
    { path: '/bottles', label: 'Bouteilles', icon: Beaker, roles: ['admin', 'bartender'] },
    { path: '/payments', label: 'Paiements', icon: CreditCard, roles: ['admin', 'cashier'] },
    { path: '/printers', label: 'Imprimantes', icon: Printer, roles: ['admin'] },
    { path: '/users', label: 'Utilisateurs', icon: Users, roles: ['admin'] },
    { path: '/settings', label: 'Paramètres', icon: Settings, roles: ['admin'] },
];

export const Sidebar = () => {
    const { user, logout, hasRole } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const filteredItems = navItems.filter(item => hasRole(item.roles));

    return (
        <aside className="bg-stone-900 text-stone-50 w-20 lg:w-64 h-screen fixed left-0 top-0 flex flex-col border-r border-stone-800 z-50">
            {/* Logo */}
            <div className="p-4 lg:p-6 border-b border-stone-800">
                <h1 className="hidden lg:block text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Lumière
                </h1>
                <span className="hidden lg:block text-xs text-stone-400 uppercase tracking-widest mt-1">
                    Point de Vente
                </span>
                <div className="lg:hidden flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-white font-bold">L</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 overflow-y-auto">
                <ul className="space-y-1 px-2 lg:px-3">
                    {filteredItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    cn(
                                        'flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-stone-400 hover:text-white hover:bg-stone-800',
                                        isActive && 'bg-primary text-white shadow-md hover:bg-primary'
                                    )
                                }
                                data-testid={`nav-${item.path.slice(1)}`}
                            >
                                <item.icon className="w-5 h-5 flex-shrink-0" strokeWidth={1.5} />
                                <span className="hidden lg:block text-sm font-medium">{item.label}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* User section */}
            <div className="p-3 lg:p-4 border-t border-stone-800">
                {/* Connection status */}
                <div className="mb-3">
                    <ConnectionStatusCompact />
                </div>
                
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-stone-300" />
                    </div>
                    <div className="hidden lg:block overflow-hidden">
                        <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                        <p className="text-xs text-stone-400 capitalize">{user?.role}</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg w-full text-stone-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    data-testid="logout-btn"
                >
                    <LogOut className="w-5 h-5" strokeWidth={1.5} />
                    <span className="hidden lg:block text-sm font-medium">Déconnexion</span>
                </button>
            </div>
        </aside>
    );
};
