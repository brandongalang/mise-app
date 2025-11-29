'use client';

import { Drawer } from 'vaul';
import { useInventory } from '@/hooks/useInventory';
import { InventoryItem } from './InventoryItem';
import { CategoryTabs } from './CategoryTabs';
import { ExpiringBanner } from '@/components/alerts/ExpiringBanner';
import { useState, useMemo } from 'react';
import { IngredientCategory } from '@/lib/types';
import { Package, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface InventorySheetProps {
    open: boolean;
    onClose: () => void;
}

export function InventorySheet({ open, onClose }: InventorySheetProps) {
    const { summary, isLoading } = useInventory();
    const [activeCategory, setActiveCategory] = useState<IngredientCategory | 'all'>('all');
    const [bannerDismissed, setBannerDismissed] = useState(false);

    const filteredItems = useMemo(() => {
        if (!summary) return [];

        let items = Object.values(summary.categories).flatMap(c => c.items);

        if (activeCategory !== 'all') {
            items = items.filter(i => i.category === activeCategory);
        }

        // Sort by expiry
        return items.sort((a, b) => (a.daysUntilExpiry ?? 999) - (b.daysUntilExpiry ?? 999));
    }, [summary, activeCategory]);

    const categories = summary ? (Object.keys(summary.categories) as IngredientCategory[]) : [];

    return (
        <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-espresso/40 backdrop-blur-sm" />
                <Drawer.Content className="bg-ivory flex flex-col rounded-t-3xl h-[90vh] mt-24 fixed bottom-0 left-0 right-0 outline-none shadow-xl">
                    {/* Handle */}
                    <div className="pt-3 pb-2">
                        <div className="mx-auto w-12 h-1.5 rounded-full bg-warm-gray-light" />
                    </div>

                    <div className="px-5 flex-1 overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-marigold/15 flex items-center justify-center">
                                    <Package className="w-5 h-5 text-marigold" />
                                </div>
                                <div>
                                    <h2 className="font-display text-xl font-bold text-espresso">
                                        Inventory
                                    </h2>
                                    <p className="text-sm text-latte">
                                        {summary?.totalCount ?? 0} items tracked
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl text-latte hover:text-espresso hover:bg-parchment transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {isLoading ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-4">
                                <motion.div
                                    className="w-10 h-10 rounded-full border-2 border-terracotta/30 border-t-terracotta"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                                <span className="text-latte font-medium">Loading inventory...</span>
                            </div>
                        ) : (
                            <>
                                {!bannerDismissed && summary && summary.expiringSoon.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-4"
                                    >
                                        <ExpiringBanner
                                            items={summary.expiringSoon}
                                            onTap={() => setActiveCategory('all')}
                                            onDismiss={() => setBannerDismissed(true)}
                                        />
                                    </motion.div>
                                )}

                                {/* Category Tabs */}
                                <div className="mb-4 -mx-5 px-5">
                                    <CategoryTabs
                                        categories={categories}
                                        activeCategory={activeCategory}
                                        onSelect={setActiveCategory}
                                    />
                                </div>

                                {/* Items List */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pb-safe-bottom">
                                    {filteredItems.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="w-16 h-16 rounded-full bg-parchment flex items-center justify-center mb-4">
                                                <Package className="w-8 h-8 text-warm-gray" />
                                            </div>
                                            <p className="text-latte font-medium">No items found</p>
                                            <p className="text-sm text-warm-gray mt-1">
                                                Scan a receipt to add items
                                            </p>
                                        </div>
                                    ) : (
                                        <motion.div
                                            className="space-y-2"
                                            initial="hidden"
                                            animate="visible"
                                            variants={{
                                                visible: {
                                                    transition: { staggerChildren: 0.03 }
                                                }
                                            }}
                                        >
                                            {filteredItems.map((item) => (
                                                <motion.div
                                                    key={item.containerId || item.id}
                                                    variants={{
                                                        hidden: { opacity: 0, y: 10 },
                                                        visible: { opacity: 1, y: 0 }
                                                    }}
                                                >
                                                    <InventoryItem item={item} />
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
