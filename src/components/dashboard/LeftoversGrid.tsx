'use client';

import { InventoryItem } from '@/lib/types';
import { LeftoverCard } from './LeftoverCard';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

interface LeftoversGridProps {
  leftovers: InventoryItem[];
  onItemTap: (item: InventoryItem) => void;
}

export function LeftoversGrid({ leftovers, onItemTap }: LeftoversGridProps) {
  if (leftovers.length === 0) return null;

  return (
    <motion.div
      className="mt-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-5 mb-3">
        <Clock className="w-4 h-4 text-marigold" />
        <h3 className="font-display text-lg font-semibold text-espresso">
          Leftovers
        </h3>
        <span className="text-xs text-latte bg-parchment px-2 py-0.5 rounded-full">
          {leftovers.length}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 px-5">
        {leftovers.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
          >
            {/* Reuse the existing card but remove fixed width for grid */}
            <div onClick={() => onItemTap(item)} className="cursor-pointer h-full">
               <LeftoverCard item={item} />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
