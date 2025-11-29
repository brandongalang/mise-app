'use client';

import { InventoryItem } from '@/lib/types';
import { AlertTriangle, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExpiringBannerProps {
    items: InventoryItem[];
    onTap: () => void;
    onDismiss: () => void;
}

export function ExpiringBanner({ items, onTap, onDismiss }: ExpiringBannerProps) {
    if (items.length === 0) return null;

    const count = items.length;
    const urgentCount = items.filter(i => (i.daysUntilExpiry ?? 99) <= 2).length;
    const firstItem = items[0];
    const days = firstItem.daysUntilExpiry ?? 0;
    const timeText = days <= 0 ? 'expired!' : days === 1 ? 'expires tomorrow' : `expires in ${days} days`;

    const isUrgent = urgentCount > 0;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div
                    className={`
                        relative overflow-hidden rounded-xl p-4 cursor-pointer
                        border transition-all duration-200
                        ${isUrgent
                            ? 'bg-gradient-to-r from-cayenne/10 to-cayenne/5 border-cayenne/20 hover:border-cayenne/30'
                            : 'bg-gradient-to-r from-marigold/10 to-marigold/5 border-marigold/20 hover:border-marigold/30'
                        }
                    `}
                    onClick={onTap}
                >
                    {/* Pulse effect for urgent */}
                    {isUrgent && (
                        <motion.div
                            className="absolute inset-0 bg-cayenne/5"
                            animate={{ opacity: [0, 0.5, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    )}

                    <div className="relative flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            {/* Icon */}
                            <div className={`
                                w-10 h-10 rounded-xl flex items-center justify-center
                                ${isUrgent ? 'bg-cayenne/15' : 'bg-marigold/15'}
                            `}>
                                <AlertTriangle
                                    className={isUrgent ? 'text-cayenne' : 'text-marigold'}
                                    size={20}
                                />
                            </div>

                            {/* Content */}
                            <div>
                                <p className="font-semibold text-espresso text-sm">
                                    {count} {count === 1 ? 'item' : 'items'} {isUrgent ? 'need attention' : 'expiring soon'}
                                </p>
                                <p className="text-xs text-latte mt-0.5">
                                    {firstItem.name} {timeText}
                                    {count > 1 && (
                                        <span className="text-warm-gray"> +{count - 1} more</span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                            <ChevronRight className="w-5 h-5 text-warm-gray" />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDismiss();
                                }}
                                className="p-1.5 rounded-lg text-warm-gray hover:text-espresso hover:bg-parchment transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
