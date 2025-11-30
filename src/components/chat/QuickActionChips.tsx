'use client';

import { Camera, ChefHat, Clock, UtensilsCrossed, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface QuickActionChipsProps {
    onAction: (text: string, openCamera?: boolean) => void;
    visible?: boolean;
}

const actions = [
    {
        id: 'scan',
        label: 'Scan Receipt',
        text: "Here's a receipt, add these items to my inventory",
        icon: Camera,
        color: 'from-terracotta/10 to-marigold/10 hover:from-terracotta/20 hover:to-marigold/20',
        iconColor: 'text-terracotta',
        openCamera: true,
    },
    {
        id: 'cook',
        label: 'What can I cook?',
        text: 'What can I cook with what I have?',
        icon: ChefHat,
        color: 'from-olive/10 to-sage/10 hover:from-olive/20 hover:to-sage/20',
        iconColor: 'text-olive',
    },
    {
        id: 'expiring',
        label: 'Expiring soon',
        text: 'What should I use up before it expires?',
        icon: Clock,
        color: 'from-marigold/10 to-cream hover:from-marigold/20 hover:to-marigold/10',
        iconColor: 'text-marigold',
    },
    {
        id: 'leftovers',
        label: 'Leftovers',
        text: 'What leftovers do I have?',
        icon: UtensilsCrossed,
        color: 'from-sage/10 to-olive/10 hover:from-sage/20 hover:to-olive/20',
        iconColor: 'text-sage',
    },
    {
        id: 'quick',
        label: 'Quick meal',
        text: 'Suggest a quick meal I can make',
        icon: Zap,
        color: 'from-terracotta/10 to-cayenne/10 hover:from-terracotta/20 hover:to-cayenne/20',
        iconColor: 'text-terracotta',
    },
];

export function QuickActionChips({ onAction, visible = true }: QuickActionChipsProps) {
    if (!visible) return null;

    return (
        <div className="px-4">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
                {actions.map((action, index) => (
                    <motion.button
                        key={action.id}
                        onClick={() => onAction(action.text, action.openCamera)}
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
                        <action.icon size={18} className={action.iconColor} />
                        <span>{action.label}</span>
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
