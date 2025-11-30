'use client';

import { InventoryItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Clock, Utensils } from 'lucide-react';
import { motion } from 'framer-motion';

interface LeftoverCardProps {
    item: InventoryItem;
    onTap?: () => void;
}

export function LeftoverCard({ item, onTap }: LeftoverCardProps) {
    const daysLeft = item.daysUntilExpiry ?? 99;
    const isUrgent = daysLeft <= 2;
    const isWarning = daysLeft <= 5 && daysLeft > 2;

    // Random slight rotation for Polaroid effect
    const rotation = Math.random() * 4 - 2; // -2 to 2 degrees

    return (
        <motion.div
            onClick={onTap}
            className="flex-shrink-0 cursor-pointer h-full"
            whileHover={{ scale: 1.03, rotate: 0 }}
            whileTap={{ scale: 0.98 }}
            style={{ rotate: rotation }}
        >
            <div className={cn(
                "texture-paper bg-bg-secondary rounded-lg shadow-sm overflow-hidden transition-all hover:shadow-md h-full flex flex-col",
                "border border-border-subtle"
            )}>
                {/* Image area */}
                <div className={cn(
                    "h-24 flex-shrink-0 flex items-center justify-center relative",
                    isUrgent
                        ? "bg-gradient-to-br from-cayenne/10 to-cayenne/5"
                        : isWarning
                            ? "bg-gradient-to-br from-marigold/10 to-marigold/5"
                            : "bg-gradient-to-br from-bg-secondary to-bg-primary"
                )}>
                    {/* Food icon/emoji */}
                    <div className="text-4xl">🥡</div>

                    {/* Urgency indicator */}
                    {isUrgent && (
                        <motion.div
                            className="absolute top-2 right-2 w-2 h-2 bg-cayenne rounded-full"
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [1, 0.7, 1]
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        />
                    )}
                </div>

                {/* Caption area - Polaroid style */}
                <div className="p-3 pt-2 flex-1 flex flex-col">
                    {/* Days badge */}
                    <div className={cn(
                        "inline-flex items-center self-start gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-2",
                        isUrgent
                            ? "bg-cayenne/10 text-cayenne"
                            : isWarning
                                ? "bg-marigold/10 text-marigold"
                                : "bg-bg-tertiary text-text-secondary"
                    )}>
                        <Clock className="w-2.5 h-2.5" />
                        {daysLeft <= 0 ? 'Today!' : `${daysLeft}d left`}
                    </div>

                    {/* Name - handwritten style */}
                    <h4 className="font-accent text-xl text-text-primary leading-tight line-clamp-2 mb-auto">
                        {item.name}
                    </h4>

                    {/* Quantity */}
                    <div className="flex items-center gap-1 mt-2 text-xs text-text-secondary font-body">
                        <Utensils className="w-3 h-3" />
                        <span>{item.quantity || item.remainingQty} {item.unit}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
