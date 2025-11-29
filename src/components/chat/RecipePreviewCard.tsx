'use client';

import { useState } from 'react';
import { RecipeCard } from '@/lib/types';
import { Clock, ChevronDown, ChevronUp, Check, Utensils, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface RecipePreviewCardProps {
    recipe: RecipeCard;
    onExpand?: () => void;
    expanded?: boolean;
}

export function RecipePreviewCard({ recipe, onExpand, expanded = false }: RecipePreviewCardProps) {
    const [isExpanded, setIsExpanded] = useState(expanded);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
        onExpand?.();
    };

    return (
        <motion.div
            className="w-full recipe-card overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Header / Collapsed View */}
            <div
                className="p-4 cursor-pointer hover:bg-parchment/30 transition-colors"
                onClick={toggleExpand}
            >
                <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                        <h3 className="font-display text-lg font-semibold text-espresso leading-tight mb-2">
                            {recipe.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Time badge */}
                            <span className="inline-flex items-center gap-1 bg-marigold/15 text-marigold px-2.5 py-1 rounded-full text-xs font-semibold">
                                <Clock size={12} />
                                {recipe.timeEstimateMins} min
                            </span>

                            {/* Uses expiring badge */}
                            {recipe.usesExpiring.length > 0 && (
                                <span className="inline-flex items-center gap-1 bg-cayenne/10 text-cayenne px-2.5 py-1 rounded-full text-xs font-semibold">
                                    <Flame size={12} />
                                    Uses {recipe.usesExpiring.length} expiring
                                </span>
                            )}
                        </div>
                    </div>

                    <motion.button
                        className="p-2 rounded-lg text-latte hover:text-espresso hover:bg-parchment transition-colors"
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown size={20} />
                    </motion.button>
                </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-clay/10 bg-parchment/20"
                    >
                        <div className="p-4 space-y-5">
                            {/* Ingredients */}
                            <div>
                                <h4 className="text-xs font-bold text-latte uppercase tracking-wider mb-3">
                                    Ingredients
                                </h4>
                                <ul className="space-y-2">
                                    {recipe.ingredients.map((ing, i) => (
                                        <motion.li
                                            key={i}
                                            className="flex items-center gap-3 text-sm"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors",
                                                ing.inStock
                                                    ? "bg-sage/20 border-sage text-sage"
                                                    : "bg-transparent border-warm-gray-light text-transparent"
                                            )}>
                                                {ing.inStock && <Check size={12} strokeWidth={3} />}
                                            </div>
                                            <span className={cn(
                                                "font-medium",
                                                ing.inStock ? "text-espresso" : "text-warm-gray italic"
                                            )}>
                                                {ing.name}
                                            </span>
                                        </motion.li>
                                    ))}
                                </ul>
                            </div>

                            {/* Steps */}
                            <div>
                                <h4 className="text-xs font-bold text-latte uppercase tracking-wider mb-3">
                                    Instructions
                                </h4>
                                <ol className="space-y-4">
                                    {recipe.steps.map((step, i) => (
                                        <motion.li
                                            key={i}
                                            className="flex gap-3 text-sm text-espresso leading-relaxed"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.2 + i * 0.05 }}
                                        >
                                            <span className="shrink-0 w-6 h-6 rounded-full bg-terracotta/10 text-terracotta text-xs font-bold flex items-center justify-center mt-0.5">
                                                {i + 1}
                                            </span>
                                            <span>{step}</span>
                                        </motion.li>
                                    ))}
                                </ol>
                            </div>

                            {/* Action Button */}
                            <motion.button
                                className="w-full mt-2 bg-olive text-white py-3 rounded-xl font-semibold text-sm shadow-md hover:bg-olive-dark transition-colors flex items-center justify-center gap-2"
                                whileTap={{ scale: 0.98 }}
                            >
                                <Utensils size={18} />
                                I Cooked This!
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
