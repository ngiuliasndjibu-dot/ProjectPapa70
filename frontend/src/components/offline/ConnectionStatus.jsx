import React from 'react';
import { useOffline } from '../../contexts/OfflineContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
    Wifi, 
    WifiOff, 
    RefreshCw, 
    CloudOff, 
    Cloud,
    AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const ConnectionStatus = ({ showDetails = false }) => {
    const { 
        isOnline, 
        syncStatus, 
        isSyncing, 
        forceSync 
    } = useOffline();

    const hasPendingData = syncStatus.pendingOrdersCount > 0 || syncStatus.pendingSyncActions > 0;

    return (
        <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
            isOnline ? 'bg-green-50' : 'bg-amber-50'
        )}>
            {/* Connection indicator */}
            <div className={cn(
                'flex items-center gap-2',
                isOnline ? 'text-green-700' : 'text-amber-700'
            )}>
                {isOnline ? (
                    <Wifi className="w-4 h-4" />
                ) : (
                    <WifiOff className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                    {isOnline ? 'En ligne' : 'Hors ligne'}
                </span>
            </div>

            {/* Pending sync indicator */}
            {hasPendingData && (
                <Badge variant="outline" className="border-amber-300 text-amber-700 text-xs">
                    <CloudOff className="w-3 h-3 mr-1" />
                    {syncStatus.pendingOrdersCount + syncStatus.pendingSyncActions} en attente
                </Badge>
            )}

            {/* Sync button */}
            {isOnline && showDetails && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={forceSync}
                    disabled={isSyncing}
                    className="h-7 px-2"
                >
                    <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
                </Button>
            )}

            {/* Last sync time */}
            {showDetails && syncStatus.lastSync && (
                <span className="text-xs text-stone-500">
                    Sync: {new Date(syncStatus.lastSync).toLocaleTimeString('fr-FR')}
                </span>
            )}
        </div>
    );
};

// Compact version for sidebar
export const ConnectionStatusCompact = () => {
    const { isOnline, syncStatus } = useOffline();
    const hasPendingData = syncStatus.pendingOrdersCount > 0 || syncStatus.pendingSyncActions > 0;

    return (
        <div className={cn(
            'flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium',
            isOnline 
                ? hasPendingData ? 'bg-amber-500/20 text-amber-300' : 'bg-green-500/20 text-green-300'
                : 'bg-red-500/20 text-red-300'
        )}>
            {isOnline ? (
                hasPendingData ? (
                    <>
                        <Cloud className="w-3 h-3" />
                        <span className="hidden lg:inline">{syncStatus.pendingOrdersCount + syncStatus.pendingSyncActions}</span>
                    </>
                ) : (
                    <>
                        <Wifi className="w-3 h-3" />
                        <span className="hidden lg:inline">Connecté</span>
                    </>
                )
            ) : (
                <>
                    <WifiOff className="w-3 h-3" />
                    <span className="hidden lg:inline">Hors ligne</span>
                </>
            )}
        </div>
    );
};

// Full status bar for top of screen
export const ConnectionStatusBar = () => {
    const { isOnline, syncStatus, isSyncing, forceSync } = useOffline();
    const hasPendingData = syncStatus.pendingOrdersCount > 0 || syncStatus.pendingSyncActions > 0;

    if (isOnline && !hasPendingData) return null;

    return (
        <div className={cn(
            'px-4 py-2 flex items-center justify-between',
            isOnline ? 'bg-amber-50 border-b border-amber-200' : 'bg-red-50 border-b border-red-200'
        )}>
            <div className="flex items-center gap-3">
                {isOnline ? (
                    <>
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        <span className="text-sm text-amber-800">
                            <strong>{syncStatus.pendingOrdersCount}</strong> commande(s) et{' '}
                            <strong>{syncStatus.pendingSyncActions}</strong> action(s) en attente de synchronisation
                        </span>
                    </>
                ) : (
                    <>
                        <WifiOff className="w-5 h-5 text-red-600" />
                        <span className="text-sm text-red-800">
                            <strong>Mode hors ligne</strong> - Les données seront synchronisées automatiquement
                        </span>
                    </>
                )}
            </div>

            {isOnline && (
                <Button
                    size="sm"
                    variant="outline"
                    onClick={forceSync}
                    disabled={isSyncing}
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                    <RefreshCw className={cn('w-4 h-4 mr-2', isSyncing && 'animate-spin')} />
                    {isSyncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
                </Button>
            )}
        </div>
    );
};
