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
            className="flex-shrink-0 cursor-pointer"
            whileHover={{ scale: 1.03, rotate: 0 }}
            whileTap={{ scale: 0.98 }}
            style={{ rotate: rotation }}
        >
            <div className={cn(
                "w-36 bg-warm-white rounded-sm shadow-md overflow-hidden transition-shadow hover:shadow-lg",
                "border border-clay/10"
            )}>
                {/* Image area */}
                <div className={cn(
                    "h-24 flex items-center justify-center relative",
                    isUrgent
                        ? "bg-gradient-to-br from-cayenne/10 to-cayenne/5"
                        : isWarning
                            ? "bg-gradient-to-br from-marigold/10 to-marigold/5"
                            : "bg-gradient-to-br from-parchment to-ivory"
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
                <div className="p-3 pt-2">
                    {/* Days badge */}
                    <div className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-2",
                        isUrgent
                            ? "bg-cayenne/10 text-cayenne"
                            : isWarning
                                ? "bg-marigold/10 text-marigold"
                                : "bg-parchment text-latte"
                    )}>
                        <Clock className="w-2.5 h-2.5" />
                        {daysLeft <= 0 ? 'Today!' : `${daysLeft}d left`}
                    </div>

                    {/* Name - handwritten style */}
                    <h4 className="font-accent text-lg text-espresso leading-tight truncate">
                        {item.name}
                    </h4>

                    {/* Quantity */}
                    <div className="flex items-center gap-1 mt-1 text-xs text-latte">
                        <Utensils className="w-3 h-3" />
                        <span>{item.quantity || item.remainingQty} {item.unit}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
