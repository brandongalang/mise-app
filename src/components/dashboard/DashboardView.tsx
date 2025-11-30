'use client';

import { useState, useEffect } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { EatFirstSection } from './EatFirstSection';
import { LeftoversGrid } from './LeftoversGrid';
import { CategoryTabs } from '@/components/inventory/CategoryTabs';
import { InventoryItem } from '@/components/inventory/InventoryItem';
import { IngredientCategory, InventoryItem as IInventoryItem } from '@/lib/types';
import { ScanLine, Sparkles, ChefHat, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProfileSwitcher } from '@/components/profiles/ProfileSwitcher';
import { useChat } from '@/hooks/useChat'; // Hook to open chat interactions

interface DashboardViewProps {
    onScan: () => void;
    onTabChange: (tab: 'kitchen' | 'assistant') => void; // Added to switch tabs
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
        return (
            <div className="flex flex-col items-center justify-center h-full text-latte gap-4">
                <motion.div
                    className="w-12 h-12 rounded-full border-2 border-terracotta/30 border-t-terracotta"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span className="font-medium">Loading your kitchen...</span>
            </div>
        );
    }

    if (error || !summary) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-cayenne gap-3 p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-cayenne/10 flex items-center justify-center text-2xl">
                    😕
                </div>
                <p className="font-medium">Failed to load inventory</p>
                <p className="text-sm text-latte">Please try again later</p>
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
        <div className="h-full overflow-y-auto bg-ivory custom-scrollbar pb-24">
            {/* Editorial Header */}
            <header className="sticky top-0 z-20 glass border-b border-clay/10">
                <div className="px-5 py-4 flex items-center justify-between">
                    <div>
                        <motion.h1
                            className="font-display text-2xl font-bold text-espresso tracking-tight"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            My Kitchen
                        </motion.h1>
                        <motion.p
                            className="text-sm text-latte mt-0.5"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                        >
                            {totalItems} items tracked
                        </motion.p>
                    </div>

                    <div className="flex items-center gap-3">
                         {/* Placeholder for Profile Switcher if needed, or keep in Header component */}
                    </div>
                </div>
            </header>

            {/* Quick Actions */}
            <div className="px-5 py-4 grid grid-cols-2 gap-3">
                 <motion.button
                    onClick={onScan}
                    whileTap={{ scale: 0.97 }}
                    className="flex flex-col items-center justify-center p-4 bg-espresso text-cream rounded-2xl shadow-lg gap-2"
                 >
                    <ScanLine className="w-6 h-6" />
                    <span className="font-medium text-sm">Scan Receipt</span>
                 </motion.button>

                 <motion.button
                    onClick={() => {
                        onTabChange('assistant');
                        sendMessage("What should I cook based on my expiring ingredients?");
                    }}
                    whileTap={{ scale: 0.97 }}
                    className="flex flex-col items-center justify-center p-4 bg-terracotta text-white rounded-2xl shadow-lg gap-2"
                 >
                    <ChefHat className="w-6 h-6" />
                    <span className="font-medium text-sm">Suggest Meal</span>
                 </motion.button>
            </div>


            {/* Eat First Section (Expiring Soon) */}
            <EatFirstSection
                leftovers={[]} // We display leftovers in their own grid now, unless urgent? Let's just use EatFirst for expiring items mainly
                expiringSoon={expiringItems} 
                onItemTap={handleItemTap}
            />

            {/* Leftovers Grid */}
            <LeftoversGrid 
                leftovers={leftovers}
                onItemTap={handleItemTap}
            />

            {/* Main Inventory */}
            <motion.div
                className="px-5 mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
            >
                {/* Section Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-lg font-semibold text-espresso">
                        Inventory
                    </h2>
                    <span className="text-xs text-latte font-medium bg-parchment px-2.5 py-1 rounded-full">
                        {filteredItems.length} items
                    </span>
                </div>

                {/* Category Tabs */}
                <div className="sticky top-[72px] z-10 -mx-5 px-5 py-2 glass">
                    <CategoryTabs
                        activeCategory={activeCategory}
                        onSelect={setActiveCategory}
                    />
                </div>

                {/* Inventory List */}
                <div className="mt-4 space-y-3 min-h-[300px]">
                    {filteredItems.length === 0 ? (
                        <motion.div
                            className="flex flex-col items-center justify-center py-16 text-center"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="w-16 h-16 rounded-full bg-parchment flex items-center justify-center mb-4">
                                <Sparkles className="w-8 h-8 text-warm-gray" />
                            </div>
                            <p className="text-latte font-medium">No items in this category</p>
                            <p className="text-sm text-warm-gray mt-1">Scan a receipt to add items</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            className="space-y-2"
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
    );
}
