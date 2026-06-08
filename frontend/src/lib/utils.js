import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// Format price with currency (default FC for backward compatibility)
export function formatPrice(price, currency = null) {
    if (currency) {
        const formatted = new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: currency.decimal_places || 0,
            maximumFractionDigits: currency.decimal_places || 0,
        }).format(price);
        return `${formatted} ${currency.symbol}`;
    }
    return new Intl.NumberFormat('fr-FR').format(price) + ' FC';
}

// Format price with specific symbol
export function formatPriceWithSymbol(price, symbol = 'FC', decimals = 0) {
    const formatted = new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(price);
    return `${formatted} ${symbol}`;
}

// Format date
export function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

// Format time only
export function formatTime(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

// Get status color class
export function getStatusClass(status) {
    const classes = {
        free: 'status-free',
        occupied: 'status-occupied',
        reserved: 'status-reserved',
        cleaning: 'status-cleaning',
    };
    return classes[status] || '';
}

// Get order status color
export function getOrderStatusClass(status) {
    const classes = {
        pending: 'order-pending',
        preparing: 'order-preparing',
        ready: 'order-ready',
    };
    return classes[status] || '';
}

// Get order status badge color
export function getOrderStatusBadge(status) {
    const colors = {
        pending: 'bg-amber-100 text-amber-800',
        preparing: 'bg-blue-100 text-blue-800',
        ready: 'bg-green-100 text-green-800',
        served: 'bg-stone-100 text-stone-800',
        cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-stone-100 text-stone-800';
}

// Get status label in French
export function getStatusLabel(status) {
    const labels = {
        free: 'Libre',
        occupied: 'Occupée',
        reserved: 'Réservée',
        cleaning: 'Nettoyage',
        pending: 'En attente',
        preparing: 'En préparation',
        ready: 'Prêt',
        served: 'Servi',
        cancelled: 'Annulé',
    };
    return labels[status] || status;
}

// Get department label in French
export function getDepartmentLabel(department) {
    const labels = {
        kitchen: 'Cuisine',
        bar: 'Bar',
    };
    return labels[department] || department;
}

// Get role label in French
export function getRoleLabel(role) {
    const labels = {
        admin: 'Administrateur',
        cashier: 'Caissier',
        server: 'Serveur',
        bartender: 'Barman',
        kitchen: 'Cuisine',
    };
    return labels[role] || role;
}

// Calculate time elapsed
export function getTimeElapsed(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000 / 60); // minutes
    
    if (diff < 1) return 'À l\'instant';
    if (diff < 60) return `${diff} min`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ${diff % 60}min`;
    return `${Math.floor(diff / 1440)}j`;
}

// Get urgency level based on wait time
export function getUrgencyLevel(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000 / 60); // minutes
    
    if (diff < 10) return 'normal';
    if (diff < 20) return 'warning';
    return 'urgent';
}

// Get urgency color
export function getUrgencyColor(level) {
    const colors = {
        normal: 'text-green-600 bg-green-50',
        warning: 'text-amber-600 bg-amber-50',
        urgent: 'text-red-600 bg-red-50',
    };
    return colors[level] || colors.normal;
}
