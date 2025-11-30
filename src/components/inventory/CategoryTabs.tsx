'use client';

import { IngredientCategory } from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
    Apple,
    Beef,
    Milk,
    Package,
    Snowflake,
    Coffee,
    LayoutGrid
} from 'lucide-react';

interface CategoryTabsProps {
    categories?: IngredientCategory[];
    activeCategory: IngredientCategory | 'all';
    onSelect: (category: IngredientCategory | 'all') => void;
}

const CATEGORY_CONFIG: Record<IngredientCategory | 'all', { label: string; icon: typeof LayoutGrid; color: string }> = {
    all: { label: 'All', icon: LayoutGrid, color: 'bg-text-primary' },
    produce: { label: 'Produce', icon: Apple, color: 'bg-sage' },
    protein: { label: 'Protein', icon: Beef, color: 'bg-cayenne' },
    dairy: { label: 'Dairy', icon: Milk, color: 'bg-sky-200' },
    pantry: { label: 'Pantry', icon: Package, color: 'bg-marigold' },
    frozen: { label: 'Frozen', icon: Snowflake, color: 'bg-sky-400' },
    beverage: { label: 'Drinks', icon: Coffee, color: 'bg-terracotta' },
    unknown: { label: 'Other', icon: Package, color: 'bg-text-tertiary' },
};

const DEFAULT_CATEGORIES: IngredientCategory[] = [
    'produce', 'protein', 'dairy', 'pantry', 'frozen', 'beverage'
];

export function CategoryTabs({ categories = DEFAULT_CATEGORIES, activeCategory, onSelect }: CategoryTabsProps) {
    const allCategories: (IngredientCategory | 'all')[] = ['all', ...categories];

    return (
        <div className="flex gap-2 overflow-x-auto py-1 hide-scrollbar -mx-1 px-1">
            {allCategories.map((cat) => {
                const config = CATEGORY_CONFIG[cat];
                const Icon = config.icon;
                const isActive = activeCategory === cat;

                return (
                    <motion.button
                        key={cat}
                        onClick={() => onSelect(cat)}
                        className={cn(
                            "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/50",
                            isActive
                                ? "text-white shadow-md"
                                : "bg-bg-secondary text-text-secondary border border-border-subtle hover:bg-bg-tertiary hover:text-text-primary"
                        )}
                        whileTap={{ scale: 0.97 }}
                    >
                        {/* Active background */}
                        {isActive && (
                            <motion.div
                                layoutId="categoryPill"
                                className="absolute inset-0 bg-text-primary rounded-full"
                                initial={false}
                                transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 35
                                }}
                            />
                        )}

                        <Icon className={cn(
                            "relative w-4 h-4 transition-colors",
                            isActive ? "text-white" : "text-text-tertiary"
                        )} strokeWidth={1.5} />
                        <span className="relative">{config.label}</span>
                    </motion.button>
                );
            })}
        </div>
    );
}
