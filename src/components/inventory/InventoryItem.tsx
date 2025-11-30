'use client';

import React from 'react';

import { InventoryItem as IInventoryItem, IngredientCategory } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Apple, Beef, Milk, Package, Snowflake, Coffee, ChevronRight } from 'lucide-react';

interface InventoryItemProps {
    item: IInventoryItem;
    onTap?: () => void;
    compact?: boolean;
}

const CATEGORY_ICONS: Record<IngredientCategory, typeof Apple> = {
    produce: Apple,
    protein: Beef,
    dairy: Milk,
    pantry: Package,
    frozen: Snowflake,
    beverage: Coffee,
    unknown: Package,
};

const CATEGORY_COLORS: Record<IngredientCategory, string> = {
    produce: 'bg-sage/15 text-sage',
    protein: 'bg-cayenne/15 text-cayenne',
    dairy: 'bg-sky-100 text-sky-600',
    pantry: 'bg-marigold/15 text-marigold',
    frozen: 'bg-sky-100 text-sky-500',
    beverage: 'bg-mocha/15 text-mocha',
    unknown: 'bg-warm-gray/15 text-warm-gray',
};

export const InventoryItem = React.memo(function InventoryItem({ item, onTap, compact = false }: InventoryItemProps) {
    const days = item.daysUntilExpiry ?? 99;

    // Expiry status
    let expiryStatus: 'urgent' | 'warning' | 'ok' = 'ok';
    if (days <= 2) expiryStatus = 'urgent';
    else if (days <= 5) expiryStatus = 'warning';

    const expiryConfig = {
        urgent: {
            text: 'text-cayenne',
            dot: 'status-dot-urgent',
            bg: 'bg-cayenne/5',
            label: days <= 0 ? 'Expired' : `${days}d left`
        },
        warning: {
            text: 'text-marigold',
            dot: 'status-dot-warning',
            bg: 'bg-marigold/5',
            label: `${days}d left`
        },
        ok: {
            text: 'text-sage',
            dot: 'status-dot-ok',
            bg: 'bg-transparent',
            label: `${days}d`
        }
    }[expiryStatus];

    const category = (item.category as IngredientCategory) || 'unknown';
    const Icon = CATEGORY_ICONS[category] || Package;
    const categoryColor = CATEGORY_COLORS[category] || 'bg-parchment text-latte';

    return (
        <button
            onClick={onTap}
            className={cn(
                "group card-elevated card-interactive cursor-pointer overflow-hidden w-full text-left relative focus:outline-none focus:ring-2 focus:ring-terracotta/50 focus:ring-offset-2 rounded-2xl",
                expiryConfig.bg,
                compact ? "p-3" : "p-4"
            )}
            aria-label={`${item.name}, ${item.remainingQty} ${item.unit}, ${expiryConfig.label}`}
        >
            <div className="flex items-center gap-3">
                {/* Category Icon */}
                <div className={cn(
                    "flex-shrink-0 rounded-xl flex items-center justify-center",
                    categoryColor,
                    compact ? "w-10 h-10" : "w-12 h-12"
                )} aria-hidden="true">
                    <Icon className={compact ? "w-5 h-5" : "w-6 h-6"} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <h4 className={cn(
                            "font-semibold text-espresso truncate",
                            compact ? "text-sm" : "text-base"
                        )}>
                            {item.name}
                        </h4>

                        {/* Expiry indicator */}
                        <div className={cn(
                            "flex items-center gap-1.5 flex-shrink-0",
                            expiryConfig.text
                        )} aria-label={`Expires in ${expiryConfig.label}`}>
                            <div className={cn("status-dot", expiryConfig.dot)} />
                            <span className="text-xs font-bold" aria-hidden="true">{expiryConfig.label}</span>
                        </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2 text-xs text-latte">
                            <span>{item.remainingQty} {item.unit}</span>
                            {item.status === 'OPEN' && (
                                <span className="badge badge-warning">OPEN</span>
                            )}
                        </div>

                        {/* Chevron on hover */}
                        <ChevronRight className="w-4 h-4 text-warm-gray-light opacity-0 group-hover:opacity-100 transition-opacity -mr-1" aria-hidden="true" />
                    </div>

                </div>
            </div>
        </button>
    );
});
