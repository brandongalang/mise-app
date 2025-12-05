'use client';

import { ReactNode } from 'react';
import { BottomNav, type TabId } from './BottomNav';
import Header from './Header';

interface MainLayoutProps {
    children: ReactNode;
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
}


export function MainLayout({ children, activeTab, onTabChange }: MainLayoutProps) {
    return (
        <div className="flex flex-col h-dvh bg-ivory texture-paper">
            {/* Subtle warm gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-parchment/30 pointer-events-none" />

            <Header />

            <main className="flex-1 overflow-hidden relative z-0 pt-16">
                {children}
            </main>

            <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
        </div>
    );
}
