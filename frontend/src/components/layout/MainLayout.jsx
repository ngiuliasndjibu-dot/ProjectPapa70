import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ConnectionStatusBar } from '../offline/ConnectionStatus';

export const MainLayout = () => {
    return (
        <div className="min-h-screen bg-background">
            <Sidebar />
            <main className="ml-20 lg:ml-64 min-h-screen flex flex-col">
                <ConnectionStatusBar />
                <div className="flex-1">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
