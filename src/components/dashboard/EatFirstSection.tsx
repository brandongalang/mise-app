'use client';

import { InventoryItem } from '@/lib/types';
import { LeftoverCard } from './LeftoverCard';
import { InventoryItem as InventoryItemRow } from '@/components/inventory/InventoryItem';
import { AlertTriangle, Clock, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

interface EatFirstSectionProps {
    leftovers: InventoryItem[];
    expiringSoon: InventoryItem[];
    onItemTap: (item: InventoryItem) => void;
}

export function EatFirstSection({ leftovers, expiringSoon, onItemTap }: EatFirstSectionProps) {
    if (leftovers.length === 0 && expiringSoon.length === 0) return null;

    const urgentCount = expiringSoon.filter(item => (item.daysUntilExpiry ?? 99) <= 2).length;

    return (
        <motion.div
            className="relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            {/* Urgency gradient background */}
            <div className="absolute inset-0 bg-gradient-urgency pointer-events-none" />

            <div className="relative px-5 py-5 space-y-6">
                {/* Section Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-cayenne/10 flex items-center justify-center">
                                <Flame className="w-5 h-5 text-cayenne" />
                            </div>
                            {urgentCount > 0 && (
                                <motion.div
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-cayenne text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                >
                                    {urgentCount}
                                </motion.div>
                            )}
                        </div>
                        <div>
                            <h2 className="font-display text-xl font-bold text-espresso">
                                Eat First
                            </h2>
                            <p className="text-xs text-latte">Use these before they expire</p>
                        </div>
                    </div>
                </div>

                {/* Leftovers Carousel */}
                {leftovers.length > 0 && (
                    <motion.div
                        className="space-y-3"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                    >
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-marigold" />
                            <h3 className="text-xs font-semibold text-latte uppercase tracking-wider">
                                Leftovers
                            </h3>
                            <span className="text-xs text-warm-gray">({leftovers.length})</span>
                        </div>

                        <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5 snap-x snap-mandatory hide-scrollbar">
                            {leftovers.map((item, index) => (
                                <motion.div
                                    key={item.id}
                                    className="snap-start"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                                >
                                    <LeftoverCard
                                        item={item}
                                        onTap={() => onItemTap(item)}
                                    />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Expiring Soon List */}
                {expiringSoon.length > 0 && (
                    <motion.div
                        className="space-y-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                    >
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-cayenne" />
                            <h3 className="text-xs font-semibold text-latte uppercase tracking-wider">
                                Expiring Soon
                            </h3>
                            <span className="text-xs text-warm-gray">({expiringSoon.length})</span>
                        </div>

                        <div className="space-y-2">
                            {expiringSoon.map((item, index) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
                                >
                                    <InventoryItemRow
                                        item={item}
                                        onTap={() => onItemTap(item)}
                                        compact
                                    />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Bottom fade to main content */}
            <div className="h-4 bg-gradient-to-b from-transparent to-ivory" />
        </motion.div>
    );
}
