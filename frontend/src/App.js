import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { MainLayout } from './components/layout/MainLayout';
import { Toaster } from './components/ui/sonner';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FloorPlanPage from './pages/FloorPlanPage';
import POSPage from './pages/POSPage';
import KitchenPage from './pages/KitchenPage';
import BarPage from './pages/BarPage';
import MenuPage from './pages/MenuPage';
import StockPage from './pages/StockPage';
import BottlesPage from './pages/BottlesPage';
import PaymentsPage from './pages/PaymentsPage';
import SettingsPage from './pages/SettingsPage';
import PrintersPage from './pages/PrintersPage';
import UsersPage from './pages/UsersPage';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { isAuthenticated, loading, user } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user?.role)) {
        // Redirect to appropriate page based on role
        switch (user?.role) {
            case 'admin':
            case 'cashier':
                return <Navigate to="/dashboard" replace />;
            case 'server':
                return <Navigate to="/pos" replace />;
            case 'bartender':
                return <Navigate to="/bar" replace />;
            case 'kitchen':
                return <Navigate to="/kitchen" replace />;
            default:
                return <Navigate to="/login" replace />;
        }
    }

    return children;
};

// Public Route (redirects if authenticated)
const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading, user } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (isAuthenticated) {
        // Redirect based on role
        switch (user?.role) {
            case 'admin':
            case 'cashier':
                return <Navigate to="/dashboard" replace />;
            case 'server':
                return <Navigate to="/pos" replace />;
            case 'bartender':
                return <Navigate to="/bar" replace />;
            case 'kitchen':
                return <Navigate to="/kitchen" replace />;
            default:
                return <Navigate to="/dashboard" replace />;
        }
    }

    return children;
};

function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route 
                path="/login" 
                element={
                    <PublicRoute>
                        <LoginPage />
                    </PublicRoute>
                } 
            />

            {/* Protected Routes with Layout */}
            <Route element={
                <ProtectedRoute>
                    <MainLayout />
                </ProtectedRoute>
            }>
                <Route 
                    path="/dashboard" 
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'cashier']}>
                            <DashboardPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/floor-plan" 
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'server', 'cashier']}>
                            <FloorPlanPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/pos" 
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'server', 'cashier']}>
                            <POSPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/kitchen" 
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'kitchen']}>
                            <KitchenPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/bar" 
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'bartender']}>
                            <BarPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/menu" 
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <MenuPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/stock" 
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <StockPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/bottles" 
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'bartender']}>
                            <BottlesPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/payments" 
                    element={
                        <ProtectedRoute allowedRoles={['admin', 'cashier']}>
                            <PaymentsPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/settings" 
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <SettingsPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/printers" 
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <PrintersPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/users" 
                    element={
                        <ProtectedRoute allowedRoles={['admin']}>
                            <UsersPage />
                        </ProtectedRoute>
                    } 
                />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <OfflineProvider>
                    <CurrencyProvider>
                        <AppRoutes />
                        <Toaster position="top-right" richColors />
                    </CurrencyProvider>
                </OfflineProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
