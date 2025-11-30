'use client';

import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';
import Header from './Header';

interface MainLayoutProps {
    children: ReactNode;
    activeTab: 'kitchen' | 'assistant';
    onTabChange: (tab: 'kitchen' | 'assistant') => void;
}

export function MainLayout({ children, activeTab, onTabChange }: MainLayoutProps) {
    return (
        <div className="flex flex-col h-dvh bg-cream texture-paper">
            {/* Header (optional, if used) */}
            <Header />

            <main className="flex-1 overflow-hidden relative z-0 pt-16">
                {children}
            </main>

            <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
        </div>
    );
}
