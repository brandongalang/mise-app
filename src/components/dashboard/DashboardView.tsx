'use client';

import { useState, useEffect } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { EatFirstSection } from './EatFirstSection';
import { LeftoversGrid } from './LeftoversGrid';
import { CategoryTabs } from '@/components/inventory/CategoryTabs';
import { InventoryItem } from '@/components/inventory/InventoryItem';
import { IngredientCategory, InventoryItem as IInventoryItem } from '@/lib/types';
import { ScanLine, Sparkles, ChefHat } from 'lucide-react';
import { motion } from 'framer-motion';
import { useChat } from '@/hooks/useChat';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';

interface DashboardViewProps {
    onScan: () => void;
    onTabChange: (tab: 'kitchen' | 'assistant') => void;
}

export function DashboardView({ onScan, onTabChange }: DashboardViewProps) {
    const { summary, isLoading, error, fetchExpiringItems, fetchLeftovers } = useInventory();
    const { sendMessage } = useChat();
    const [activeCategory, setActiveCategory] = useState<IngredientCategory | 'all'>('all');

    // Local state for focused items (fetched client-side on mount)
    const [expiringItems, setExpiringItems] = useState<IInventoryItem[]>([]);
    const [leftovers, setLeftovers] = useState<IInventoryItem[]>([]);

    // Fetch focused data on mount
    useEffect(() => {
        const loadFocusedData = async () => {
            const [exp, left] = await Promise.all([
                fetchExpiringItems(),
                fetchLeftovers()
            ]);
            setExpiringItems(exp);
            setLeftovers(left);
        };
        loadFocusedData();
    }, [fetchExpiringItems, fetchLeftovers]);

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    if (error || !summary) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-cayenne gap-3 p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-cayenne/10 flex items-center justify-center text-2xl">
                    😕
                </div>
                <p className="font-medium">Failed to load inventory</p>
                <p className="text-sm text-text-secondary">Please try again later</p>
            </div>
        );
    }

    const handleItemTap = (item: IInventoryItem) => {
        // Interaction: Ask chat about this item
        onTabChange('assistant');
        sendMessage(`What can I cook with ${item.name}?`);
    };

    const getFilteredItems = () => {
        if (activeCategory === 'all') {
            return Object.values(summary.categories).flatMap(c => c.items);
        }
        return summary.categories[activeCategory]?.items || [];
    };

    const filteredItems = getFilteredItems();
    const totalItems = Object.values(summary.categories).reduce((acc, c) => acc + c.items.length, 0);

    return (
        <div className="h-full overflow-y-auto bg-bg-primary custom-scrollbar pb-24">
            {/* Editorial Header */}
            <header className="sticky top-0 z-20 glass border-b border-border-subtle">
                <div className="px-5 py-6 flex items-end justify-between">
                    <div>
                        <motion.h1
                            className="font-display text-4xl font-bold text-text-primary tracking-tight leading-none"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            Mise
                        </motion.h1>
                        <motion.p
                            className="text-sm font-body text-text-secondary mt-1 tracking-wide uppercase"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                        >
                            Kitchen Assistant
                        </motion.p>
                    </div>

                    <div className="text-right">
                        <motion.p
                            className="text-xs font-bold text-terracotta bg-terracotta/10 px-2 py-1 rounded-full border border-terracotta/20"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                        >
                            {totalItems} ITEMS
                        </motion.p>
                    </div>
                </div>
            </header>

            <div className="px-5 py-6 space-y-8">
                {/* Bento Grid: Quick Actions & Highlights */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Action: Scan */}
                    <motion.button
                        onClick={onScan}
                        whileTap={{ scale: 0.97 }}
                        className="col-span-1 aspect-[4/3] flex flex-col items-center justify-center p-4 bg-text-primary text-bg-primary rounded-2xl shadow-lg gap-3 focus:outline-none focus:ring-2 focus:ring-terracotta/50 focus:ring-offset-2 relative overflow-hidden group"
                        aria-label="Scan Receipt"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <ScanLine className="w-8 h-8" aria-hidden="true" strokeWidth={1.5} />
                        <span className="font-display font-bold text-lg leading-none">Scan</span>
                    </motion.button>

                    {/* Action: Suggest */}
                    <motion.button
                        onClick={() => {
                            onTabChange('assistant');
                            sendMessage("What should I cook based on my expiring ingredients?");
                        }}
                        whileTap={{ scale: 0.97 }}
                        className="col-span-1 aspect-[4/3] flex flex-col items-center justify-center p-4 bg-terracotta text-white rounded-2xl shadow-lg gap-3 focus:outline-none focus:ring-2 focus:ring-terracotta/50 focus:ring-offset-2 relative overflow-hidden group"
                        aria-label="Suggest Meal"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <ChefHat className="w-8 h-8" aria-hidden="true" strokeWidth={1.5} />
                        <span className="font-display font-bold text-lg leading-none">Cook</span>
                    </motion.button>
                </div>

                {/* Eat First Section */}
                <div className="space-y-4">
                    <EatFirstSection
                        leftovers={[]}
                        expiringSoon={expiringItems}
                        onItemTap={handleItemTap}
                    />
                </div>

                {/* Leftovers Grid */}
                <div className="space-y-4">
                    <LeftoversGrid
                        leftovers={leftovers}
                        onItemTap={handleItemTap}
                    />
                </div>

                {/* Main Inventory */}
                <motion.div
                    className="space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                >
                    {/* Section Header */}
                    <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                        <h2 className="font-display text-2xl font-bold text-text-primary">
                            Pantry
                        </h2>
                    </div>

                    {/* Category Tabs */}
                    <div className="sticky top-[88px] z-10 -mx-5 px-5 py-2 glass backdrop-blur-xl">
                        <CategoryTabs
                            activeCategory={activeCategory}
                            onSelect={setActiveCategory}
                        />
                    </div>

                    {/* Inventory List */}
                    <div className="space-y-3 min-h-[300px]">
                        {filteredItems.length === 0 ? (
                            <motion.div
                                className="flex flex-col items-center justify-center py-16 text-center"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="w-16 h-16 rounded-full bg-bg-secondary flex items-center justify-center mb-4 shadow-inner">
                                    <Sparkles className="w-8 h-8 text-text-tertiary" />
                                </div>
                                <p className="text-text-secondary font-medium font-display text-lg">Empty Shelf</p>
                                <p className="text-sm text-text-tertiary mt-1">Scan a receipt to stock up</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                className="grid grid-cols-1 gap-3"
                                initial="hidden"
                                animate="visible"
                                variants={{
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.05
                                        }
                                    }
                                }}
                            >
                                {filteredItems.map((item, index) => (
                                    <motion.div
                                        key={item.id}
                                        variants={{
                                            hidden: { opacity: 0, y: 10 },
                                            visible: { opacity: 1, y: 0 }
                                        }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <InventoryItem
                                            item={item}
                                            onTap={() => handleItemTap(item)}
                                        />
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
