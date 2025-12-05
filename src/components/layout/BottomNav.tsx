'use client';

import { cn } from '@/lib/utils';
import { MessageCircle, Refrigerator, Calendar, BookOpen, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';

export type TabId = 'kitchen' | 'plan' | 'recipes' | 'shop' | 'assistant';

interface BottomNavProps {
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
}

const tabs = [
    { id: 'kitchen' as const, label: 'Kitchen', icon: Refrigerator },
    { id: 'plan' as const, label: 'Plan', icon: Calendar },
    { id: 'recipes' as const, label: 'Recipes', icon: BookOpen },
    { id: 'shop' as const, label: 'Shop', icon: ShoppingCart },
    { id: 'assistant' as const, label: 'Chat', icon: MessageCircle },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
    return (
        <div className="relative z-0">
            {/* Frosted glass navigation */}
            <nav className="glass border-t border-clay/10 pb-safe-bottom">
                <div className="flex justify-around items-center h-16 px-2">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={cn(
                                    "relative flex flex-col items-center justify-center w-full h-full space-y-0.5 transition-all duration-200",
                                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/50 focus-visible:ring-offset-2 rounded-lg"
                                )}
                            >
                                {/* Icon container with animated background */}
                                <div className="relative">
                                    {isActive && (
                                        <motion.div
                                            layoutId="navIndicator"
                                            className="absolute -inset-2 bg-terracotta/10 rounded-xl"
                                            initial={false}
                                            transition={{
                                                type: "spring",
                                                stiffness: 500,
                                                damping: 35
                                            }}
                                        />
                                    )}
                                    <Icon
                                        className={cn(
                                            "relative w-5 h-5 transition-colors duration-200",
                                            isActive ? "text-terracotta" : "text-warm-gray"
                                        )}
                                        strokeWidth={isActive ? 2 : 1.5}
                                    />
                                </div>

                                {/* Label */}
                                <span
                                    className={cn(
                                        "text-[10px] font-medium transition-colors duration-200",
                                        isActive ? "text-terracotta" : "text-warm-gray"
                                    )}
                                >
                                    {tab.label}
                                </span>

                                {/* Active indicator dot */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeDot"
                                        className="absolute -bottom-0.5 w-1 h-1 bg-terracotta rounded-full"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 500,
                                            damping: 30
                                        }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
