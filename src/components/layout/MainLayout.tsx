'use client';

import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface MainLayoutProps {
    children: ReactNode;
    activeTab: 'kitchen' | 'assistant';
    onTabChange: (tab: 'kitchen' | 'assistant') => void;
}

export function MainLayout({ children, activeTab, onTabChange }: MainLayoutProps) {
    return (
        <div className="flex flex-col h-screen bg-ivory texture-paper">
            {/* Subtle warm gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-parchment/30 pointer-events-none" />

            <main className="flex-1 overflow-hidden relative z-10">
                {children}
            </main>

            <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
        </div>
    );
}
