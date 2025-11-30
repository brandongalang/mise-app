'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { QUICK_ACTIONS } from '@/lib/constants';

interface QuickActionChipsProps {
    onAction: (text: string, openCamera?: boolean) => void;
    visible?: boolean;
}

export const QuickActionChips = React.memo(function QuickActionChips({ onAction, visible = true }: QuickActionChipsProps) {
    if (!visible) return null;

    return (
        <div className="px-4">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
                {QUICK_ACTIONS.map((action, index) => (
                    <motion.button
                        key={action.id}
                        onClick={() => onAction(action.text, (action as any).openCamera)}
                        className={cn(
                            "flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5",
                            "bg-gradient-to-r border border-clay/10 shadow-sm",
                            "text-sm font-medium text-espresso",
                            "transition-all duration-200 active:scale-[0.98]",
                            action.color
                        )}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        whileTap={{ scale: 0.97 }}
                    >
                        <action.icon size={18} className={action.iconColor} aria-hidden="true" />
                        <span>{action.label}</span>
                    </motion.button>
                ))}
            </div>
        </div>
    );
});
